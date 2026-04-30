import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const host = '127.0.0.1';
const vitePort = Number(process.env.TINYVECTORS_VITE_PORT ?? 5176);
const viteHmrPort = Number(process.env.TINYVECTORS_VITE_HMR_PORT ?? vitePort + 19000);
const cdpPort = Number(process.env.TINYVECTORS_CDP_PORT ?? 9228);
const chromePath = findChrome();

if (!chromePath) {
	console.error('Chrome executable not found. Set CHROME_PATH to run this probe.');
	process.exit(1);
}

const children = new Set();

process.on('exit', () => {
	for (const child of children) {
		child.kill('SIGTERM');
	}
});

function spawnChild(command, args, options = {}) {
	const child = spawn(command, args, {
		stdio: ['ignore', 'pipe', 'pipe'],
		env: process.env,
		...options,
	});
	children.add(child);
	child.once('exit', () => children.delete(child));
	return child;
}

function findChrome() {
	if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

	const candidates = [
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		'/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
		'google-chrome',
		'google-chrome-stable',
		'chromium',
		'chromium-browser',
	];

	for (const candidate of candidates) {
		if (candidate.startsWith('/')) {
			const result = spawnSync('test', ['-x', candidate]);
			if (result.status === 0) return candidate;
			continue;
		}

		const result = spawnSync('command', ['-v', candidate], {
			shell: true,
			encoding: 'utf8',
		});
		if (result.status === 0 && result.stdout.trim()) {
			return result.stdout.trim();
		}
	}

	return null;
}

async function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForFetch(url, timeoutMs = 15000) {
	const started = Date.now();
	let lastError;

	while (Date.now() - started < timeoutMs) {
		try {
			const response = await fetch(url);
			if (response.ok) return response;
			lastError = new Error(`${response.status} ${response.statusText}`);
		} catch (error) {
			lastError = error;
		}
		await delay(100);
	}

	throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function waitForJson(url, timeoutMs = 15000) {
	const response = await waitForFetch(url, timeoutMs);
	return await response.json();
}

async function terminateChildren() {
	const exiting = [...children].map(
		(child) =>
			new Promise((resolve) => {
				child.once('exit', resolve);
				child.kill('SIGTERM');
				setTimeout(resolve, 2000);
			}),
	);

	await Promise.all(exiting);
	children.clear();
}

async function removeDirectoryWithRetry(directory) {
	for (let attempt = 0; attempt < 5; attempt++) {
		try {
			await rm(directory, { recursive: true, force: true });
			return;
		} catch (error) {
			if (attempt === 4) throw error;
			await delay(200);
		}
	}
}

class CdpClient {
	constructor(url) {
		this.nextId = 1;
		this.pending = new Map();
		this.ws = new WebSocket(url);
		this.ready = new Promise((resolve, reject) => {
			this.ws.addEventListener('open', resolve, { once: true });
			this.ws.addEventListener('error', reject, { once: true });
		});
		this.ws.addEventListener('message', (event) => {
			const message = JSON.parse(event.data);
			if (!message.id || !this.pending.has(message.id)) return;

			const pending = this.pending.get(message.id);
			this.pending.delete(message.id);

			if (message.error) {
				pending.reject(new Error(`${message.error.code}: ${message.error.message}`));
			} else {
				pending.resolve(message.result ?? {});
			}
		});
	}

	async send(method, params = {}) {
		await this.ready;

		const id = this.nextId++;
		this.ws.send(JSON.stringify({ id, method, params }));

		return await new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				if (!this.pending.has(id)) return;
				this.pending.delete(id);
				reject(new Error(`Timed out waiting for ${method}`));
			}, 10000);

			this.pending.set(id, {
				resolve(value) {
					clearTimeout(timer);
					resolve(value);
				},
				reject(error) {
					clearTimeout(timer);
					reject(error);
				},
			});
		});
	}

	close() {
		this.ws.close();
	}
}

async function evaluate(client, expression) {
	const result = await client.send('Runtime.evaluate', {
		expression,
		awaitPromise: true,
		returnByValue: true,
	});

	if (result.exceptionDetails) {
		throw new Error(JSON.stringify(result.exceptionDetails));
	}

	return result.result.value;
}

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

let chromeProfile;
let client;

try {
	const vite = spawnChild('pnpm', [
		'exec',
		'vite',
		'--config',
		'vite.dev.config.ts',
		'--host',
		host,
		'--port',
		String(vitePort),
	], {
		env: {
			...process.env,
			CI: 'true',
			TINYVECTORS_VITE_PORT: String(vitePort),
			TINYVECTORS_VITE_HMR_PORT: String(viteHmrPort),
		},
	});

	vite.stderr.on('data', (chunk) => {
		process.stderr.write(chunk);
	});

	await waitForFetch(`http://${host}:${vitePort}/`);

	chromeProfile = await mkdtemp(join(tmpdir(), 'tinyvectors-cdp-profile-'));
	const chrome = spawnChild(chromePath, [
		'--headless=new',
		'--disable-gpu',
		'--disable-dev-shm-usage',
		'--no-first-run',
		'--no-default-browser-check',
		`--remote-debugging-address=${host}`,
		`--remote-debugging-port=${cdpPort}`,
		`--user-data-dir=${chromeProfile}`,
		'about:blank',
	]);

	chrome.stderr.on('data', (chunk) => {
		if (process.env.DEBUG_CHROME === 'true') {
			process.stderr.write(chunk);
		}
	});

	const version = await waitForJson(`http://${host}:${cdpPort}/json/version`);
	const tabs = await waitForJson(`http://${host}:${cdpPort}/json/list`);
	const page = tabs.find((tab) => tab.type === 'page') ?? tabs[0];

	client = new CdpClient(page.webSocketDebuggerUrl);
	await client.send('Runtime.enable');
	await client.send('Page.enable');
	await client.send('Page.addScriptToEvaluateOnNewDocument', {
		source: `
			window.__tinyvectorsEvents = [];
			(() => {
				const originalAddEventListener = EventTarget.prototype.addEventListener;
				const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
				const listenerIds = new WeakMap();
				const activeWindowListeners = new Map();
				let nextListenerId = 1;

				const listenerId = (listener) => {
					if ((typeof listener !== 'function' && typeof listener !== 'object') || listener === null) {
						return String(listener);
					}
					if (!listenerIds.has(listener)) {
						listenerIds.set(listener, nextListenerId++);
					}
					return listenerIds.get(listener);
				};

				window.__tinyvectorsListenerLedger = {
					snapshot() {
						const counts = {};
						for (const type of activeWindowListeners.values()) {
							counts[type] = (counts[type] || 0) + 1;
						}
						return counts;
					},
				};

				EventTarget.prototype.addEventListener = function(type, listener, options) {
					if (this === window && listener) {
						activeWindowListeners.set(type + ':' + listenerId(listener), type);
					}
					return originalAddEventListener.call(this, type, listener, options);
				};

				EventTarget.prototype.removeEventListener = function(type, listener, options) {
					if (this === window && listener) {
						activeWindowListeners.delete(type + ':' + listenerId(listener));
					}
					return originalRemoveEventListener.call(this, type, listener, options);
				};

				originalAddEventListener.call(window, 'deviceorientation', (event) => {
				window.__tinyvectorsEvents.push({
					type: 'deviceorientation',
					alpha: event.alpha,
					beta: event.beta,
					gamma: event.gamma,
					at: performance.now()
				});
				});
				originalAddEventListener.call(window, 'devicemotion', (event) => {
				const gravity = event.accelerationIncludingGravity;
				window.__tinyvectorsEvents.push({
					type: 'devicemotion',
					x: gravity && gravity.x,
					y: gravity && gravity.y,
					z: gravity && gravity.z,
					at: performance.now()
				});
				});
			})();
		`,
	});

	const pageUrl = `http://${host}:${vitePort}/?controls=true&animated=true&deviceMotion=true&pointerPhysics=false&scrollPhysics=false&blobs=8`;
	await client.send('Page.navigate', { url: pageUrl });
	await delay(1500);

	const initial = await evaluate(client, `({
		secure: window.isSecureContext,
		hasDeviceMotionEvent: 'DeviceMotionEvent' in window,
		hasDeviceOrientationEvent: 'DeviceOrientationEvent' in window,
		hasAccelerometer: 'Accelerometer' in window,
		status: document.getElementById('motion-status')?.textContent ?? null,
		pathCount: document.querySelectorAll('path').length,
		firstPath: document.querySelector('path')?.getAttribute('d') ?? null,
		events: window.__tinyvectorsEvents
	})`);

	assert(initial.secure, 'Page must be a secure context for device motion APIs.');
	assert(initial.hasDeviceOrientationEvent, 'DeviceOrientationEvent is not exposed in Chrome.');
	assert(initial.pathCount > 0, 'TinyVectors SVG paths were not rendered.');

	await client.send('Runtime.evaluate', {
		expression: `document.getElementById('spoof-tilt-btn')?.click()`,
		awaitPromise: true,
	});
	await delay(1000);

	const afterSpoof = await evaluate(client, `({
		status: document.getElementById('motion-status')?.textContent ?? null,
		firstPath: document.querySelector('path')?.getAttribute('d') ?? null,
		events: window.__tinyvectorsEvents
	})`);

	assert(
		afterSpoof.status?.startsWith('motion x '),
		`Synthetic orientation did not reach TinyVectors; status was ${afterSpoof.status}`,
	);
	assert(afterSpoof.events.length > initial.events.length, 'Synthetic orientation was not observed.');
	assert(afterSpoof.firstPath !== initial.firstPath, 'Synthetic orientation did not change blob geometry.');

	await client.send('DeviceOrientation.setDeviceOrientationOverride', {
		alpha: 180,
		beta: 50,
		gamma: -40,
	});
	await delay(1000);

	const afterCdpOrientation = await evaluate(client, `({
		status: document.getElementById('motion-status')?.textContent ?? null,
		firstPath: document.querySelector('path')?.getAttribute('d') ?? null,
		events: window.__tinyvectorsEvents
	})`);

	assert(
		afterCdpOrientation.events.length > afterSpoof.events.length,
		'CDP device orientation override did not emit a page event.',
	);
	assert(
		afterCdpOrientation.firstPath !== afterSpoof.firstPath,
		'CDP device orientation override did not change blob geometry.',
	);

	const listenerProbeUrl = `http://${host}:${vitePort}/?controls=true&animated=true&deviceMotion=true&pointerPhysics=true&scrollPhysics=true&blobs=8&listenerProbe=1`;
	await client.send('Page.navigate', { url: listenerProbeUrl });
	await delay(1500);

	const listenerInitial = await evaluate(client, `({
		pathCount: document.querySelectorAll('path').length,
		bodyPathCount: document.querySelectorAll('svg g')[1]?.querySelectorAll('path').length ?? 0,
		gradientCount: document.querySelectorAll('radialGradient').length,
		listeners: window.__tinyvectorsListenerLedger?.snapshot?.() ?? {}
	})`);

	assert(listenerInitial.pathCount === 32, `Expected 32 SVG paths, got ${listenerInitial.pathCount}.`);
	assert(listenerInitial.bodyPathCount === 8, `Expected 8 body paths, got ${listenerInitial.bodyPathCount}.`);
	assert(
		listenerInitial.gradientCount === 32,
		`Expected 32 radial gradients, got ${listenerInitial.gradientCount}.`,
	);
	assert(
		listenerInitial.listeners.wheel === 1,
		`Expected one wheel listener, got ${listenerInitial.listeners.wheel}.`,
	);
	assert(
		listenerInitial.listeners.pointermove === 1,
		`Expected one pointermove listener, got ${listenerInitial.listeners.pointermove}.`,
	);
	assert(
		listenerInitial.listeners.deviceorientation === 1,
		`Expected one deviceorientation listener, got ${listenerInitial.listeners.deviceorientation}.`,
	);

	await client.send('Runtime.evaluate', {
		expression: `document.getElementById('scroll-physics')?.click()`,
		awaitPromise: true,
	});
	await delay(300);
	const afterScrollOff = await evaluate(client, `({
		listeners: window.__tinyvectorsListenerLedger?.snapshot?.() ?? {}
	})`);
	assert(!afterScrollOff.listeners.wheel, 'Wheel listener leaked after disabling scroll physics.');

	await client.send('Runtime.evaluate', {
		expression: `document.getElementById('pointer-physics')?.click()`,
		awaitPromise: true,
	});
	await delay(300);
	const afterPointerOff = await evaluate(client, `({
		listeners: window.__tinyvectorsListenerLedger?.snapshot?.() ?? {}
	})`);
	assert(!afterPointerOff.listeners.pointermove, 'Pointer listener leaked after disabling pointer physics.');

	await client.send('Runtime.evaluate', {
		expression: `document.getElementById('device-motion')?.click()`,
		awaitPromise: true,
	});
	await delay(300);
	const afterDeviceMotionOff = await evaluate(client, `({
		listeners: window.__tinyvectorsListenerLedger?.snapshot?.() ?? {}
	})`);
	assert(
		!afterDeviceMotionOff.listeners.deviceorientation,
		'Device orientation listener leaked after disabling device motion.',
	);

	await client.send('Emulation.setSensorOverrideEnabled', {
		type: 'accelerometer',
		enabled: true,
		metadata: { available: true, minimumFrequency: 1, maximumFrequency: 60 },
	});
	await client.send('Page.navigate', { url: `${pageUrl}&accelerometerProbe=1` });
	await delay(1500);

	const beforeCdpAccelerometer = await evaluate(client, `({
		hasAccelerometer: 'Accelerometer' in window,
		status: document.getElementById('motion-status')?.textContent ?? null,
		firstPath: document.querySelector('path')?.getAttribute('d') ?? null,
		events: window.__tinyvectorsEvents
	})`);

	await client.send('Emulation.setSensorOverrideReadings', {
		type: 'accelerometer',
		reading: {
			xyz: {
				x: 4,
				y: -3,
				z: 9.80665,
			},
		},
	});
	await delay(1000);

	const afterCdpAccelerometer = await evaluate(client, `({
		status: document.getElementById('motion-status')?.textContent ?? null,
		firstPath: document.querySelector('path')?.getAttribute('d') ?? null,
		events: window.__tinyvectorsEvents
	})`);

	const cdpAccelerometerChanged =
		afterCdpAccelerometer.firstPath !== beforeCdpAccelerometer.firstPath;

	console.log(
		JSON.stringify(
			{
				chrome: version.Browser,
				pageUrl,
				initial: {
					secure: initial.secure,
					hasDeviceMotionEvent: initial.hasDeviceMotionEvent,
					hasDeviceOrientationEvent: initial.hasDeviceOrientationEvent,
					hasAccelerometer: initial.hasAccelerometer,
					pathCount: initial.pathCount,
				},
				syntheticOrientation: {
					status: afterSpoof.status,
					events: afterSpoof.events.length,
					pathChanged: afterSpoof.firstPath !== initial.firstPath,
				},
				cdpOrientation: {
					status: afterCdpOrientation.status,
					events: afterCdpOrientation.events.length,
					pathChanged: afterCdpOrientation.firstPath !== afterSpoof.firstPath,
					lastEvent: afterCdpOrientation.events.at(-1),
				},
				cdpAccelerometer: {
					hasAccelerometer: beforeCdpAccelerometer.hasAccelerometer,
					status: afterCdpAccelerometer.status,
					windowEvents: afterCdpAccelerometer.events.length,
					pathChanged: cdpAccelerometerChanged,
					note: 'TinyVectors uses DeviceOrientationEvent/TiltSource; raw accelerometer CDP is informational.',
				},
				listenerLifecycle: {
					initial: listenerInitial.listeners,
					afterScrollOff: afterScrollOff.listeners,
					afterPointerOff: afterPointerOff.listeners,
					afterDeviceMotionOff: afterDeviceMotionOff.listeners,
				},
			},
			null,
			2,
		),
	);
} catch (error) {
	console.error(error);
	process.exitCode = 1;
} finally {
	client?.close();
	await terminateChildren();
	if (chromeProfile) {
		await removeDirectoryWithRetry(chromeProfile);
	}
}

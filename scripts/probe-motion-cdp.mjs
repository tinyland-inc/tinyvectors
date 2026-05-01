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

function parseMotionStatus(status) {
	const match = /^motion x (-?\d+(?:\.\d+)?) y (-?\d+(?:\.\d+)?) z (-?\d+(?:\.\d+)?)$/.exec(status ?? '');
	if (!match) return null;
	return {
		x: Number(match[1]),
		y: Number(match[2]),
		z: Number(match[3]),
	};
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
				originalAddEventListener.call(window, 'pointermove', (event) => {
				window.__tinyvectorsEvents.push({
					type: 'pointermove',
					x: event.clientX,
					y: event.clientY,
					at: performance.now()
				});
				});
			})();
		`,
	});

	const disabledUrl = `http://${host}:${vitePort}/?controls=true&animated=true&deviceMotion=false&pointerPhysics=false&scrollPhysics=false&blobs=8&listenerProbe=1`;
	await client.send('Page.navigate', { url: disabledUrl });
	await delay(1000);

	const disabledInitial = await evaluate(client, `({
		motionStatus: window.__tinyvectorsDeviceMotionStatus?.() ?? null,
		pathCount: document.querySelectorAll('path').length,
		listeners: window.__tinyvectorsListenerLedger?.snapshot?.() ?? {}
	})`);

	assert(disabledInitial.pathCount > 0, 'TinyVectors did not render when IO features were disabled.');
	assert(
		disabledInitial.motionStatus?.enabled === false,
		'Disabled device motion page reported device motion enabled.',
	);
	assert(
		disabledInitial.motionStatus?.active === false,
		'Disabled device motion page reported an active listener.',
	);
	assert(!disabledInitial.listeners.wheel, 'Wheel listener attached when scroll physics was disabled.');
	assert(
		!disabledInitial.listeners.pointermove,
		'Pointer listener attached when pointer physics was disabled.',
	);
	assert(
		!disabledInitial.listeners.pointercancel,
		'Pointer cancel listener attached when pointer physics was disabled.',
	);
	assert(
		!disabledInitial.listeners.deviceorientation,
		'Device orientation listener attached when device motion was disabled.',
	);

	const pageUrl = `http://${host}:${vitePort}/?controls=true&animated=true&deviceMotion=true&pointerPhysics=false&scrollPhysics=false&blobs=8&motionIdleReset=700`;
	await client.send('Page.navigate', { url: pageUrl });
	await delay(1500);

	const initial = await evaluate(client, `({
		secure: window.isSecureContext,
		hasDeviceMotionEvent: 'DeviceMotionEvent' in window,
		hasDeviceOrientationEvent: 'DeviceOrientationEvent' in window,
		hasAccelerometer: 'Accelerometer' in window,
		motionStatus: window.__tinyvectorsDeviceMotionStatus?.() ?? null,
		status: document.getElementById('motion-status')?.textContent ?? null,
		pathCount: document.querySelectorAll('path').length,
		firstPath: document.querySelector('path')?.getAttribute('d') ?? null,
		events: window.__tinyvectorsEvents
	})`);

	assert(initial.secure, 'Page must be a secure context for device motion APIs.');
	assert(initial.hasDeviceOrientationEvent, 'DeviceOrientationEvent is not exposed in Chrome.');
	assert(initial.pathCount > 0, 'TinyVectors SVG paths were not rendered.');
	assert(initial.motionStatus?.enabled === true, 'Device motion status did not report enabled.');
	assert(initial.motionStatus?.supported === true, 'Device motion status did not report support.');
	assert(
		initial.motionStatus?.permissionState === 'granted',
		`Device motion status did not report granted; got ${initial.motionStatus?.permissionState}.`,
	);
	assert(initial.motionStatus?.active === true, 'Device motion status did not report active listener.');

	await client.send('Runtime.evaluate', {
		expression: `document.getElementById('spoof-tilt-btn')?.click()`,
		awaitPromise: true,
	});
	await delay(350);

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
	const syntheticMotion = parseMotionStatus(afterSpoof.status);
	assert(syntheticMotion, `Synthetic orientation status was not parseable: ${afterSpoof.status}`);
	assert(
		syntheticMotion.x < 0 && syntheticMotion.y > 0,
		`Synthetic orientation did not preserve expected direction; got ${afterSpoof.status}`,
	);

	await delay(550);
	const afterIdleReset = await evaluate(client, `({
		status: document.getElementById('motion-status')?.textContent ?? null,
		events: window.__tinyvectorsEvents
	})`);

	assert(
		afterIdleReset.status === 'motion x 0.00 y 0.00 z 0.00',
		`Device orientation idle reset did not neutralize motion; status was ${afterIdleReset.status}`,
	);

	await client.send('Emulation.setEmulatedMedia', {
		features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
	});
	await delay(350);

	const afterReducedMotion = await evaluate(client, `({
		motionStatus: window.__tinyvectorsDeviceMotionStatus?.() ?? null,
		status: document.getElementById('motion-status')?.textContent ?? null,
		listeners: window.__tinyvectorsListenerLedger?.snapshot?.() ?? {}
	})`);

	assert(
		afterReducedMotion.status === 'motion x 0.00 y 0.00 z 0.00',
		`Reduced motion did not neutralize active motion; status was ${afterReducedMotion.status}`,
	);
	assert(
		afterReducedMotion.motionStatus?.active === false,
		'Reduced motion did not stop the device orientation listener.',
	);
	assert(
		!afterReducedMotion.listeners.deviceorientation,
		'Device orientation listener leaked while reduced motion was enabled.',
	);

	await client.send('Emulation.setEmulatedMedia', {
		features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
	});
	await delay(350);

	const afterReducedMotionRestore = await evaluate(client, `({
		motionStatus: window.__tinyvectorsDeviceMotionStatus?.() ?? null,
		listeners: window.__tinyvectorsListenerLedger?.snapshot?.() ?? {}
	})`);

	assert(
		afterReducedMotionRestore.motionStatus?.active === true,
		'Device orientation listener did not restart after reduced motion was disabled.',
	);
	assert(
		afterReducedMotionRestore.listeners.deviceorientation === 1,
		`Expected one deviceorientation listener after reduced motion restore, got ${afterReducedMotionRestore.listeners.deviceorientation}.`,
	);

	await client.send('DeviceOrientation.setDeviceOrientationOverride', {
		alpha: 180,
		beta: 50,
		gamma: -40,
	});
	await delay(350);

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
	const cdpOrientationMotion = parseMotionStatus(afterCdpOrientation.status);
	assert(
		cdpOrientationMotion,
		`CDP orientation status was not parseable: ${afterCdpOrientation.status}`,
	);
	assert(
		cdpOrientationMotion.x < 0 && cdpOrientationMotion.y > 0,
		`CDP orientation did not preserve expected direction; got ${afterCdpOrientation.status}`,
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

	assert(listenerInitial.pathCount === 24, `Expected 24 SVG paths, got ${listenerInitial.pathCount}.`);
	assert(listenerInitial.bodyPathCount === 8, `Expected 8 body paths, got ${listenerInitial.bodyPathCount}.`);
	assert(
		listenerInitial.gradientCount === 24,
		`Expected 24 radial gradients, got ${listenerInitial.gradientCount}.`,
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
		listenerInitial.listeners.pointerout === 1,
		`Expected one pointerout listener, got ${listenerInitial.listeners.pointerout}.`,
	);
	assert(
		listenerInitial.listeners.pointercancel === 1,
		`Expected one pointercancel listener, got ${listenerInitial.listeners.pointercancel}.`,
	);
	assert(
		listenerInitial.listeners.blur === 1,
		`Expected one blur listener, got ${listenerInitial.listeners.blur}.`,
	);
	assert(
		listenerInitial.listeners.deviceorientation === 1,
		`Expected one deviceorientation listener, got ${listenerInitial.listeners.deviceorientation}.`,
	);

	const beforePointerMove = await evaluate(client, `({
		firstBodyPath: document.querySelectorAll('svg g')[1]?.querySelector('path')?.getAttribute('d') ?? null,
		pointerEvents: window.__tinyvectorsEvents.filter((event) => event.type === 'pointermove').length
	})`);
	await client.send('Input.dispatchMouseEvent', {
		type: 'mouseMoved',
		x: 120,
		y: 180,
		button: 'none',
	});
	await delay(500);
	const afterPointerMove = await evaluate(client, `({
		firstBodyPath: document.querySelectorAll('svg g')[1]?.querySelector('path')?.getAttribute('d') ?? null,
		pointerEvents: window.__tinyvectorsEvents.filter((event) => event.type === 'pointermove').length,
		lastPointerEvent: window.__tinyvectorsEvents.filter((event) => event.type === 'pointermove').at(-1)
	})`);
	assert(beforePointerMove.firstBodyPath, 'Pointer probe could not read initial blob geometry.');
	assert(afterPointerMove.firstBodyPath, 'Pointer probe could not read updated blob geometry.');
	assert(
		afterPointerMove.pointerEvents > beforePointerMove.pointerEvents,
		'CDP pointer move did not reach the page.',
	);
	assert(
		afterPointerMove.lastPointerEvent?.x === 120 && afterPointerMove.lastPointerEvent?.y === 180,
		`CDP pointer move reached the page with unexpected coordinates ${JSON.stringify(afterPointerMove.lastPointerEvent)}.`,
	);
	assert(
		afterPointerMove.firstBodyPath !== beforePointerMove.firstBodyPath,
		'Pointer probe did not observe animated blob geometry movement after pointer delivery.',
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
	assert(!afterPointerOff.listeners.pointerout, 'Pointer exit listener leaked after disabling pointer physics.');
	assert(!afterPointerOff.listeners.pointercancel, 'Pointer cancel listener leaked after disabling pointer physics.');
	assert(!afterPointerOff.listeners.blur, 'Pointer blur listener leaked after disabling pointer physics.');

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
					motionStatus: initial.motionStatus,
					pathCount: initial.pathCount,
				},
				disabledInitial: {
					motionStatus: disabledInitial.motionStatus,
					pathCount: disabledInitial.pathCount,
					listeners: disabledInitial.listeners,
				},
				syntheticOrientation: {
					status: afterSpoof.status,
					motion: syntheticMotion,
					events: afterSpoof.events.length,
					pathChanged: afterSpoof.firstPath !== initial.firstPath,
					idleResetStatus: afterIdleReset.status,
				},
				reducedMotion: {
					status: afterReducedMotion.status,
					activeAfterReduce: afterReducedMotion.motionStatus?.active,
					listenersAfterReduce: afterReducedMotion.listeners,
					activeAfterRestore: afterReducedMotionRestore.motionStatus?.active,
					listenersAfterRestore: afterReducedMotionRestore.listeners,
				},
				cdpOrientation: {
					status: afterCdpOrientation.status,
					motion: cdpOrientationMotion,
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
				pointerDelivery: {
					events: afterPointerMove.pointerEvents - beforePointerMove.pointerEvents,
					pathChanged: afterPointerMove.firstBodyPath !== beforePointerMove.firstBodyPath,
					lastEvent: afterPointerMove.lastPointerEvent,
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

import { mount, unmount } from 'svelte';
import App from './App.svelte';
import type { MotionVector } from '../src/motion/DeviceMotion.js';

interface DevAppHandle {
	requestDeviceMotionPermission: () => Promise<boolean>;
	calibrateDeviceMotion: (samples?: number) => void;
}

const params = new URLSearchParams(window.location.search);
const themes = ['tinyland', 'trans', 'pride'] as const;

function booleanParam(name: string, fallback: boolean): boolean {
	const value = params.get(name);
	if (value === null) return fallback;
	return !['0', 'false', 'off', 'no'].includes(value.toLowerCase());
}

function numberParam(name: string, fallback: number, min: number, max: number): number {
	const value = Number(params.get(name));
	if (!Number.isFinite(value)) return fallback;
	return Math.max(min, Math.min(max, Math.round(value)));
}

function themeParam(): (typeof themes)[number] {
	const value = params.get('theme');
	return themes.includes(value as (typeof themes)[number]) ? (value as (typeof themes)[number]) : 'tinyland';
}

const initialDarkMode = booleanParam('dark', true);
const showControls = booleanParam('controls', true);
document.body.classList.toggle('dark', initialDarkMode);
document.body.classList.toggle('light', !initialDarkMode);
document.body.classList.toggle('hide-controls', !showControls);
document.documentElement.classList.toggle('dark', initialDarkMode);
document.documentElement.classList.toggle('light', !initialDarkMode);

let app: (ReturnType<typeof mount> & DevAppHandle) | null = null;

function updateMotionStatus(text: string): void {
	const motionStatus = document.getElementById('motion-status');
	if (motionStatus) {
		motionStatus.textContent = text;
	}
}

function formatMotionSample(sample: MotionVector): string {
	const x = sample.x.toFixed(2);
	const y = sample.y.toFixed(2);
	const z = sample.z.toFixed(2);
	return `motion x ${x} y ${y} z ${z}`;
}

function createDeviceOrientationEvent(alpha: number, beta: number, gamma: number): Event {
	if (typeof DeviceOrientationEvent === 'function') {
		return new DeviceOrientationEvent('deviceorientation', {
			alpha,
			beta,
			gamma,
			absolute: false,
		});
	}

	const event = new Event('deviceorientation');
	Object.defineProperties(event, {
		alpha: { value: alpha },
		beta: { value: beta },
		gamma: { value: gamma },
		absolute: { value: false },
	});
	return event;
}

function spoofOrientation(alpha: number, beta: number, gamma: number): void {
	window.dispatchEvent(createDeviceOrientationEvent(alpha, beta, gamma));
}

let currentProps = {
	theme: themeParam(),
	blobCount: numberParam('blobs', 8, 4, 16),
	animated: booleanParam('animated', true),
	enableDeviceMotion: booleanParam('deviceMotion', true),
	enableScrollPhysics: booleanParam('scrollPhysics', true),
	enablePointerPhysics: booleanParam('pointerPhysics', true),
	deviceMotionIdleResetMs: numberParam('motionIdleReset', 2000, 0, 10000),
	onMotionSample(sample: MotionVector) {
		updateMotionStatus(formatMotionSample(sample));
	},
};

function mountApp() {
	const target = document.getElementById('app');
	if (!target) return;

	if (app) {
		unmount(app);
	}

	app = mount(App, {
		target,
		props: currentProps,
	}) as ReturnType<typeof mount> & DevAppHandle;
}


mountApp();


const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
if (themeSelect) {
	themeSelect.value = currentProps.theme;
}
themeSelect?.addEventListener('change', () => {
	currentProps.theme = themeSelect.value as 'tinyland' | 'trans' | 'pride';
	mountApp();
});


const blobCountSlider = document.getElementById('blob-count') as HTMLInputElement;
const blobCountValue = document.getElementById('blob-count-value');
if (blobCountSlider) {
	blobCountSlider.value = String(currentProps.blobCount);
}
if (blobCountValue) {
	blobCountValue.textContent = String(currentProps.blobCount);
}
blobCountSlider?.addEventListener('input', () => {
	currentProps.blobCount = parseInt(blobCountSlider.value, 10);
	if (blobCountValue) {
		blobCountValue.textContent = blobCountSlider.value;
	}
});
blobCountSlider?.addEventListener('change', () => {
	mountApp();
});


const darkModeCheckbox = document.getElementById('dark-mode') as HTMLInputElement;
if (darkModeCheckbox) {
	darkModeCheckbox.checked = initialDarkMode;
}
darkModeCheckbox?.addEventListener('change', () => {
	document.body.classList.toggle('dark', darkModeCheckbox.checked);
	document.body.classList.toggle('light', !darkModeCheckbox.checked);
	document.documentElement.classList.toggle('dark', darkModeCheckbox.checked);
	document.documentElement.classList.toggle('light', !darkModeCheckbox.checked);
});


const animatedCheckbox = document.getElementById('animated') as HTMLInputElement;
if (animatedCheckbox) {
	animatedCheckbox.checked = currentProps.animated;
}
animatedCheckbox?.addEventListener('change', () => {
	currentProps.animated = animatedCheckbox.checked;
	mountApp();
});

const deviceMotionCheckbox = document.getElementById('device-motion') as HTMLInputElement;
if (deviceMotionCheckbox) {
	deviceMotionCheckbox.checked = currentProps.enableDeviceMotion;
}
deviceMotionCheckbox?.addEventListener('change', () => {
	currentProps.enableDeviceMotion = deviceMotionCheckbox.checked;
	mountApp();
});

const scrollPhysicsCheckbox = document.getElementById('scroll-physics') as HTMLInputElement;
if (scrollPhysicsCheckbox) {
	scrollPhysicsCheckbox.checked = currentProps.enableScrollPhysics;
}
scrollPhysicsCheckbox?.addEventListener('change', () => {
	currentProps.enableScrollPhysics = scrollPhysicsCheckbox.checked;
	mountApp();
});

const pointerPhysicsCheckbox = document.getElementById('pointer-physics') as HTMLInputElement;
if (pointerPhysicsCheckbox) {
	pointerPhysicsCheckbox.checked = currentProps.enablePointerPhysics;
}
pointerPhysicsCheckbox?.addEventListener('change', () => {
	currentProps.enablePointerPhysics = pointerPhysicsCheckbox.checked;
	mountApp();
});

const requestMotionBtn = document.getElementById('request-motion-btn');
requestMotionBtn?.addEventListener('click', async () => {
	const granted = (await app?.requestDeviceMotionPermission()) ?? false;
	updateMotionStatus(granted ? 'motion granted; waiting for sample' : 'motion unavailable');
});

const calibrateMotionBtn = document.getElementById('calibrate-motion-btn');
calibrateMotionBtn?.addEventListener('click', () => {
	app?.calibrateDeviceMotion(10);
	updateMotionStatus('calibration queued');
});

const spoofTiltBtn = document.getElementById('spoof-tilt-btn');
spoofTiltBtn?.addEventListener('click', () => {
	spoofOrientation(120, 35, -45);
});

const neutralTiltBtn = document.getElementById('neutral-tilt-btn');
neutralTiltBtn?.addEventListener('click', () => {
	spoofOrientation(0, 0, 0);
});

const reloadBtn = document.getElementById('reload-btn');
reloadBtn?.addEventListener('click', () => {
	mountApp();
});

export default app;

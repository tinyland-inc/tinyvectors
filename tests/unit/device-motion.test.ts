import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	DeviceMotion,
	getDeviceMotionCapabilityState,
	isDeviceMotionPermissionRequired,
} from '../../src/motion/DeviceMotion.js';

type PermissionResponse = 'granted' | 'denied';

interface MockMotionWindow extends Partial<Window> {
	DeviceOrientationEvent?: { requestPermission?: () => Promise<PermissionResponse> };
}

let now = 0;

function createMotionEnvironment(options: {
	secure?: boolean;
	orientation?: boolean;
	permission?: () => Promise<PermissionResponse>;
	reducedMotion?: boolean;
	angle?: number;
	legacyReducedMotionListener?: boolean;
} = {}) {
	const windowListeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
	const documentListeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
	const mqlListeners = new Set<() => void>();

	const addWindowListener = vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
		const listeners = windowListeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
		listeners.add(listener);
		windowListeners.set(type, listeners);
	});
	const removeWindowListener = vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
		windowListeners.get(type)?.delete(listener);
	});
	const addDocumentListener = vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
		const listeners = documentListeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
		listeners.add(listener);
		documentListeners.set(type, listeners);
	});
	const removeDocumentListener = vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
		documentListeners.get(type)?.delete(listener);
	});

	const mql = {
		matches: options.reducedMotion ?? false,
		...(options.legacyReducedMotionListener
			? {
					addListener: vi.fn((listener: () => void) => {
						mqlListeners.add(listener);
					}),
					removeListener: vi.fn((listener: () => void) => {
						mqlListeners.delete(listener);
					}),
				}
			: {
					addEventListener: vi.fn((_type: string, listener: () => void) => {
						mqlListeners.add(listener);
					}),
					removeEventListener: vi.fn((_type: string, listener: () => void) => {
						mqlListeners.delete(listener);
					}),
				}),
	};

	const motionWindow: MockMotionWindow = {
		isSecureContext: options.secure ?? true,
		addEventListener: addWindowListener,
		removeEventListener: removeWindowListener,
		matchMedia: vi.fn(() => mql as unknown as MediaQueryList),
	};
	const motionDocument = {
		hidden: false,
		addEventListener: addDocumentListener,
		removeEventListener: removeDocumentListener,
	};

	if (options.orientation ?? true) {
		motionWindow.DeviceOrientationEvent = {};
		if (options.permission) {
			motionWindow.DeviceOrientationEvent.requestPermission = options.permission;
		}
	}

	vi.stubGlobal('window', motionWindow);
	vi.stubGlobal('document', motionDocument);
	vi.stubGlobal('screen', {
		orientation: {
			angle: options.angle ?? 0,
		},
	});

	const dispatchWindow = (type: string, event: unknown) => {
		for (const listener of windowListeners.get(type) ?? []) {
			if (typeof listener === 'function') {
				listener(event as Event);
			} else {
				listener.handleEvent(event as Event);
			}
		}
	};

	return {
		addDocumentListener,
		addWindowListener,
		dispatchDocument(type: string) {
			for (const listener of documentListeners.get(type) ?? []) {
				if (typeof listener === 'function') {
					listener({ type } as Event);
				} else {
					listener.handleEvent({ type } as Event);
				}
			}
		},
		dispatchOrientation(beta: number, gamma: number, alpha: number | null = null) {
			dispatchWindow('deviceorientation', { beta, gamma, alpha });
		},
		mql,
		motionDocument,
		motionWindow,
		removeDocumentListener,
		removeWindowListener,
		dispatchReducedMotionChange() {
			for (const listener of mqlListeners) {
				listener();
			}
		},
	};
}

beforeEach(() => {
	now = 0;
	vi.spyOn(performance, 'now').mockImplementation(() => now);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('DeviceMotion', () => {
	it('reports capability and permission requirement without creating a listener', () => {
		const requestPermission = vi.fn().mockResolvedValue('granted' as const);
		createMotionEnvironment({ permission: requestPermission });

		expect(getDeviceMotionCapabilityState()).toBe('unknown');
		expect(isDeviceMotionPermissionRequired()).toBe(true);
		expect(requestPermission).not.toHaveBeenCalled();
	});

	it('reports insecure and unsupported capability states', () => {
		createMotionEnvironment({ secure: false });
		expect(getDeviceMotionCapabilityState()).toBe('insecure');

		createMotionEnvironment({ orientation: false });
		expect(getDeviceMotionCapabilityState()).toBe('unsupported');
		expect(isDeviceMotionPermissionRequired()).toBe(false);
	});

	it('reports unsupported when initialized without a browser window', async () => {
		const motion = new DeviceMotion(vi.fn());

		await expect(motion.initialize()).resolves.toBe(false);

		expect(motion.getPermissionState()).toBe('unsupported');
		expect(motion.isActive()).toBe(false);
	});

	it('reports insecure contexts without starting listeners', async () => {
		const env = createMotionEnvironment({ secure: false });
		const motion = new DeviceMotion(vi.fn());

		await expect(motion.initialize()).resolves.toBe(false);

		expect(motion.getPermissionState()).toBe('insecure');
		expect(env.addWindowListener).not.toHaveBeenCalled();
	});

	it('starts immediately when no permission API is required', async () => {
		const env = createMotionEnvironment();
		const callback = vi.fn();
		const motion = new DeviceMotion(callback, {
			baselineAlpha: 0,
			deadZone: 0,
			warmupMs: 250,
		});

		await expect(motion.initialize()).resolves.toBe(true);
		now = 300;
		env.dispatchOrientation(22.5, -45);

		expect(motion.getPermissionState()).toBe('granted');
		expect(motion.isActive()).toBe(true);
		expect(callback).toHaveBeenCalledWith({ x: -1, y: 0.5, z: 0 });
	});

	it('defers listener startup until explicit permission is granted', async () => {
		const requestPermission = vi.fn().mockResolvedValue('granted' as const);
		const env = createMotionEnvironment({ permission: requestPermission });
		const callback = vi.fn();
		const motion = new DeviceMotion(callback, {
			baselineAlpha: 0,
			deadZone: 0,
			warmupMs: 250,
		});

		await expect(motion.initialize()).resolves.toBe(false);

		expect(motion.getPermissionState()).toBe('prompt');
		expect(env.addWindowListener).not.toHaveBeenCalled();

		await expect(motion.requestPermission()).resolves.toBe(true);
		now = 300;
		env.dispatchOrientation(45, 0);

		expect(requestPermission).toHaveBeenCalledOnce();
		expect(motion.getPermissionState()).toBe('granted');
		expect(callback).toHaveBeenCalledWith({ x: 0, y: 1, z: 0 });
	});

	it('calls the permission API with DeviceOrientationEvent as receiver', async () => {
		let receiver: unknown;
		const requestPermission = vi.fn(function (this: unknown) {
			receiver = this;
			return Promise.resolve('granted' as const);
		});
		const env = createMotionEnvironment({ permission: requestPermission });
		const motion = new DeviceMotion(vi.fn());

		await expect(motion.requestPermission()).resolves.toBe(true);

		expect(receiver).toBe(env.motionWindow.DeviceOrientationEvent);
	});

	it('does not restart listeners after cleanup resolves an in-flight permission request', async () => {
		let resolvePermission: (value: PermissionResponse) => void = () => {};
		const permission = new Promise<PermissionResponse>((resolve) => {
			resolvePermission = resolve;
		});
		const env = createMotionEnvironment({ permission: () => permission });
		const motion = new DeviceMotion(vi.fn());

		const request = motion.requestPermission();
		motion.cleanup();
		resolvePermission('granted');

		await expect(request).resolves.toBe(false);
		expect(env.addWindowListener).not.toHaveBeenCalled();
		expect(motion.isActive()).toBe(false);
	});

	it('does not start listeners when reduced motion is enabled during a permission request', async () => {
		let resolvePermission: (value: PermissionResponse) => void = () => {};
		const permission = new Promise<PermissionResponse>((resolve) => {
			resolvePermission = resolve;
		});
		const env = createMotionEnvironment({ permission: () => permission });
		const callback = vi.fn();
		const motion = new DeviceMotion(callback);

		const request = motion.requestPermission();
		env.mql.matches = true;
		env.dispatchReducedMotionChange();
		resolvePermission('granted');

		await expect(request).resolves.toBe(false);
		expect(motion.isActive()).toBe(false);
		expect(env.addWindowListener).not.toHaveBeenCalled();
		expect(callback).toHaveBeenLastCalledWith({ x: 0, y: 0, z: 0 });

		env.mql.matches = false;
		env.dispatchReducedMotionChange();

		expect(motion.getPermissionState()).toBe('granted');
		expect(motion.isActive()).toBe(true);
		expect(env.addWindowListener).toHaveBeenCalledWith('deviceorientation', expect.any(Function), {
			passive: true,
		});
	});

	it('calibrates against caller-requested samples', async () => {
		const env = createMotionEnvironment();
		const callback = vi.fn();
		const motion = new DeviceMotion(callback, {
			baselineAlpha: 0,
			deadZone: 0,
			warmupMs: 0,
		});

		await motion.initialize();
		motion.calibrate(1);

		now = 10;
		env.dispatchOrientation(10, 20);
		now = 20;
		env.dispatchOrientation(20, 30);

		expect(callback).toHaveBeenCalledOnce();
		expect(callback).toHaveBeenCalledWith({
			x: (30 - 20) / 45,
			y: (20 - 10) / 45,
			z: 0,
		});
	});

	it('does not re-arm warmup after calibration completes', async () => {
		const env = createMotionEnvironment();
		const callback = vi.fn();
		const motion = new DeviceMotion(callback, {
			baselineAlpha: 0,
			deadZone: 0,
			warmupMs: 250,
		});

		await motion.initialize();
		now = 300;
		motion.calibrate(1);

		env.dispatchOrientation(10, 20);
		now = 301;
		env.dispatchOrientation(20, 30);

		expect(callback).toHaveBeenCalledOnce();
		expect(callback).toHaveBeenCalledWith({
			x: (30 - 20) / 45,
			y: (20 - 10) / 45,
			z: 0,
		});
	});

	it('emits neutral motion when sensor events go idle', async () => {
		vi.useFakeTimers();
		const env = createMotionEnvironment();
		const callback = vi.fn();
		const motion = new DeviceMotion(callback, {
			baselineAlpha: 0,
			deadZone: 0,
			idleResetMs: 100,
			warmupMs: 0,
		});

		await motion.initialize();
		now = 10;
		env.dispatchOrientation(45, 0);
		vi.advanceTimersByTime(99);

		expect(callback).toHaveBeenCalledOnce();

		vi.advanceTimersByTime(1);

		expect(callback).toHaveBeenLastCalledWith({ x: 0, y: 0, z: 0 });
		motion.cleanup();
	});

	it('neutralizes motion when the document is hidden', async () => {
		const env = createMotionEnvironment();
		const callback = vi.fn();
		const motion = new DeviceMotion(callback, {
			baselineAlpha: 0,
			deadZone: 0,
			warmupMs: 0,
		});

		await motion.initialize();
		now = 10;
		env.dispatchOrientation(45, 0);
		env.motionDocument.hidden = true;
		env.dispatchDocument('visibilitychange');

		expect(callback).toHaveBeenLastCalledWith({ x: 0, y: 0, z: 0 });
	});

	it('honors reduced motion as a hard disable', async () => {
		const env = createMotionEnvironment({ reducedMotion: true });
		const motion = new DeviceMotion(vi.fn());

		await expect(motion.initialize()).resolves.toBe(false);
		await expect(motion.requestPermission()).resolves.toBe(false);

		expect(motion.getPermissionState()).toBe('denied');
		expect(env.addWindowListener).not.toHaveBeenCalled();
	});

	it('neutralizes active motion when reduced motion is enabled', async () => {
		const env = createMotionEnvironment();
		const callback = vi.fn();
		const motion = new DeviceMotion(callback, {
			baselineAlpha: 0,
			deadZone: 0,
			warmupMs: 0,
		});

		await expect(motion.initialize()).resolves.toBe(true);
		now = 10;
		env.dispatchOrientation(45, 0);
		env.mql.matches = true;
		env.dispatchReducedMotionChange();

		expect(motion.isActive()).toBe(false);
		expect(callback).toHaveBeenLastCalledWith({ x: 0, y: 0, z: 0 });
	});

	it('supports legacy reduced-motion media query listeners', async () => {
		const env = createMotionEnvironment({ legacyReducedMotionListener: true });
		const callback = vi.fn();
		const motion = new DeviceMotion(callback, {
			baselineAlpha: 0,
			deadZone: 0,
			warmupMs: 0,
		});

		await expect(motion.initialize()).resolves.toBe(true);
		expect(env.mql.addListener).toHaveBeenCalledWith(expect.any(Function));

		now = 10;
		env.dispatchOrientation(45, 0);
		env.mql.matches = true;
		env.dispatchReducedMotionChange();

		expect(motion.isActive()).toBe(false);
		expect(callback).toHaveBeenLastCalledWith({ x: 0, y: 0, z: 0 });

		motion.cleanup();
		expect(env.mql.removeListener).toHaveBeenCalledWith(expect.any(Function));
	});

	it('restarts after reduced motion is disabled when no permission prompt is needed', async () => {
		const env = createMotionEnvironment({ reducedMotion: true });
		const motion = new DeviceMotion(vi.fn());

		await expect(motion.initialize()).resolves.toBe(false);
		env.mql.matches = false;
		env.dispatchReducedMotionChange();

		expect(motion.getPermissionState()).toBe('granted');
		expect(motion.isActive()).toBe(true);
		expect(env.addWindowListener).toHaveBeenCalledWith('deviceorientation', expect.any(Function), {
			passive: true,
		});
	});

	it('returns to prompt after reduced motion is disabled when permission is gated', async () => {
		const requestPermission = vi.fn().mockResolvedValue('granted' as const);
		const env = createMotionEnvironment({ permission: requestPermission, reducedMotion: true });
		const motion = new DeviceMotion(vi.fn());

		await expect(motion.initialize()).resolves.toBe(false);
		env.mql.matches = false;
		env.dispatchReducedMotionChange();

		expect(motion.getPermissionState()).toBe('prompt');
		expect(motion.isActive()).toBe(false);
		expect(env.addWindowListener).not.toHaveBeenCalled();
		expect(requestPermission).not.toHaveBeenCalled();
	});
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DeviceMotion } from '../../src/motion/DeviceMotion.js';

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
		addEventListener: vi.fn((_type: string, listener: () => void) => {
			mqlListeners.add(listener);
		}),
		removeEventListener: vi.fn((_type: string, listener: () => void) => {
			mqlListeners.delete(listener);
		}),
	};

	const motionWindow: MockMotionWindow = {
		isSecureContext: options.secure ?? true,
		addEventListener: addWindowListener,
		removeEventListener: removeWindowListener,
		matchMedia: vi.fn(() => mql as unknown as MediaQueryList),
	};

	if (options.orientation ?? true) {
		motionWindow.DeviceOrientationEvent = {};
		if (options.permission) {
			motionWindow.DeviceOrientationEvent.requestPermission = options.permission;
		}
	}

	vi.stubGlobal('window', motionWindow);
	vi.stubGlobal('document', {
		hidden: false,
		addEventListener: addDocumentListener,
		removeEventListener: removeDocumentListener,
	});
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
		dispatchOrientation(beta: number, gamma: number, alpha: number | null = null) {
			dispatchWindow('deviceorientation', { beta, gamma, alpha });
		},
		mql,
		removeDocumentListener,
		removeWindowListener,
	};
}

beforeEach(() => {
	now = 0;
	vi.spyOn(performance, 'now').mockImplementation(() => now);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('DeviceMotion', () => {
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

	it('honors reduced motion as a hard disable', async () => {
		const env = createMotionEnvironment({ reducedMotion: true });
		const motion = new DeviceMotion(vi.fn());

		await expect(motion.initialize()).resolves.toBe(false);
		await expect(motion.requestPermission()).resolves.toBe(false);

		expect(motion.getPermissionState()).toBe('denied');
		expect(env.addWindowListener).not.toHaveBeenCalled();
	});
});

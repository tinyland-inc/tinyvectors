import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	createPointerPhysicsController,
	detectPointerPhysicsCapability,
	getLatestPointerEvent,
	type PointerLifecycleEventName,
	type PointerLikeEvent,
} from '../../src/motion/PointerPhysicsController.js';

type PointerTestEvent = Partial<PointerLikeEvent> & { relatedTarget?: EventTarget | null };

function createTarget() {
	const listeners = new Map<PointerLifecycleEventName, EventListener>();
	const addEventListener = vi.fn(
		(
			type: PointerLifecycleEventName,
			listener: EventListener,
			_options?: AddEventListenerOptions,
		) => {
			listeners.set(type, listener);
		},
	);
	const removeEventListener = vi.fn((type: PointerLifecycleEventName, listener: EventListener) => {
		if (listeners.get(type) === listener) {
			listeners.delete(type);
		}
	});

	return {
		addEventListener,
		dispatch(type: PointerLifecycleEventName, event: PointerTestEvent = {}) {
			listeners.get(type)?.(event as unknown as Event);
		},
		listeners,
		removeEventListener,
	};
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('getLatestPointerEvent', () => {
	it('uses the newest coalesced event when present', () => {
		const latest = { clientX: 30, clientY: 40 };
		const event = {
			clientX: 10,
			clientY: 20,
			getCoalescedEvents: () => [{ clientX: 20, clientY: 30 }, latest],
		};

		expect(getLatestPointerEvent(event)).toBe(latest);
	});

	it('falls back to the parent event without coalesced samples', () => {
		const event = { clientX: 10, clientY: 20, getCoalescedEvents: () => [] };

		expect(getLatestPointerEvent(event)).toBe(event);
	});
});

describe('detectPointerPhysicsCapability', () => {
	it('accepts pointer events as direct pointer IO support', () => {
		expect(detectPointerPhysicsCapability({ PointerEvent: function PointerEvent() {} })).toBe(
			true,
		);
	});

	it('accepts touch points and pointer media queries', () => {
		expect(detectPointerPhysicsCapability({ navigator: { maxTouchPoints: 1 } })).toBe(true);
		expect(
			detectPointerPhysicsCapability({
				matchMedia: (query) => ({ matches: query.includes('pointer') }),
			}),
		).toBe(true);
	});

	it('falls back to mouse IO and rejects environments without pointer input', () => {
		expect(detectPointerPhysicsCapability({ MouseEvent: function MouseEvent() {} })).toBe(
			true,
		);
		expect(detectPointerPhysicsCapability({})).toBe(false);
	});
});

describe('createPointerPhysicsController', () => {
	const bounds = {
		left: 10,
		top: 20,
		width: 200,
		height: 100,
	};

	it('registers pointermove when pointer events are supported', () => {
		const target = createTarget();
		const controller = createPointerPhysicsController({
			target,
			getBounds: () => bounds,
			supportsPointerEvents: true,
			requestFrame: vi.fn(),
			cancelFrame: vi.fn(),
			updatePosition: vi.fn(),
		});

		expect(controller.eventName).toBe('pointermove');
		expect(controller.exitEventName).toBe('pointerout');
		expect(target.addEventListener).toHaveBeenCalledWith(
			'pointermove',
			expect.any(Function),
			{ passive: true },
		);
		expect(target.addEventListener).toHaveBeenCalledWith(
			'pointerout',
			expect.any(Function),
			{ passive: true },
		);
		expect(target.addEventListener).toHaveBeenCalledWith('blur', expect.any(Function));

		controller.dispose();
	});

	it('falls back to mousemove when pointer events are unavailable', () => {
		const target = createTarget();
		const controller = createPointerPhysicsController({
			target,
			getBounds: () => bounds,
			supportsPointerEvents: false,
			requestFrame: vi.fn(),
			cancelFrame: vi.fn(),
			updatePosition: vi.fn(),
		});

		expect(controller.eventName).toBe('mousemove');
		expect(controller.exitEventName).toBe('mouseout');
		expect(target.addEventListener).toHaveBeenCalledWith(
			'mousemove',
			expect.any(Function),
			{ passive: true },
		);
		expect(target.addEventListener).toHaveBeenCalledWith(
			'mouseout',
			expect.any(Function),
			{ passive: true },
		);

		controller.dispose();
	});

	it('rAF-throttles pointer updates and maps the latest position', () => {
		const target = createTarget();
		const updatePosition = vi.fn();
		const frameCallbacks: FrameRequestCallback[] = [];
		const requestFrame = vi.fn((callback: FrameRequestCallback) => {
			frameCallbacks.push(callback);
			return frameCallbacks.length;
		});

		createPointerPhysicsController({
			target,
			getBounds: () => bounds,
			supportsPointerEvents: true,
			requestFrame,
			cancelFrame: vi.fn(),
			updatePosition,
		});

		target.dispatch('pointermove', { clientX: 60, clientY: 45 });
		target.dispatch('pointermove', { clientX: 110, clientY: 70 });

		expect(requestFrame).toHaveBeenCalledOnce();
		expect(updatePosition).not.toHaveBeenCalled();

		frameCallbacks[0](16);

		expect(updatePosition).toHaveBeenCalledOnce();
		expect(updatePosition).toHaveBeenCalledWith({ x: 50, y: 50 });
	});

	it('uses the latest coalesced pointer sample before flushing', () => {
		const target = createTarget();
		const updatePosition = vi.fn();
		let frameCallback: FrameRequestCallback | undefined;

		createPointerPhysicsController({
			target,
			getBounds: () => bounds,
			supportsPointerEvents: true,
			requestFrame(callback) {
				frameCallback = callback;
				return 1;
			},
			cancelFrame: vi.fn(),
			updatePosition,
		});

		target.dispatch('pointermove', {
			clientX: 0,
			clientY: 0,
			getCoalescedEvents: () => [
				{ clientX: 60, clientY: 45 },
				{ clientX: 210, clientY: 120 },
			],
		});
		frameCallback?.(16);

		expect(updatePosition).toHaveBeenCalledWith({ x: 100, y: 100 });
	});

	it('resets stale pointer position when pointer IO leaves the viewport', () => {
		const target = createTarget();
		const cancelFrame = vi.fn();
		const updatePosition = vi.fn();
		const controller = createPointerPhysicsController({
			target,
			getBounds: () => bounds,
			range: { min: -1, max: 1 },
			supportsPointerEvents: true,
			requestFrame: vi.fn(() => 42),
			cancelFrame,
			updatePosition,
		});

		target.dispatch('pointermove', { clientX: 110, clientY: 70 });
		target.dispatch('pointerout', {
			relatedTarget: null,
		});

		expect(cancelFrame).toHaveBeenCalledWith(42);
		expect(updatePosition).toHaveBeenCalledWith({ x: 0, y: 0 });
		expect(controller.exitEventName).toBe('pointerout');
	});

	it('ignores pointerout transitions that stay inside the document', () => {
		const target = createTarget();
		const updatePosition = vi.fn();
		createPointerPhysicsController({
			target,
			getBounds: () => bounds,
			supportsPointerEvents: true,
			requestFrame: vi.fn(),
			cancelFrame: vi.fn(),
			updatePosition,
		});

		target.dispatch('pointerout', {
			relatedTarget: {} as EventTarget,
		});

		expect(updatePosition).not.toHaveBeenCalled();
	});

	it('resets stale pointer position on window blur', () => {
		const target = createTarget();
		const updatePosition = vi.fn();
		createPointerPhysicsController({
			target,
			getBounds: () => bounds,
			supportsPointerEvents: false,
			requestFrame: vi.fn(),
			cancelFrame: vi.fn(),
			updatePosition,
		});

		target.dispatch('blur');

		expect(updatePosition).toHaveBeenCalledWith({ x: 50, y: 50 });
	});

	it('removes listeners and cancels pending work during cleanup', () => {
		const target = createTarget();
		const cancelFrame = vi.fn();
		const updatePosition = vi.fn();
		let frameCallback: FrameRequestCallback | undefined;
		const controller = createPointerPhysicsController({
			target,
			getBounds: () => bounds,
			supportsPointerEvents: true,
			requestFrame(callback) {
				frameCallback = callback;
				return 42;
			},
			cancelFrame,
			updatePosition,
		});

		target.dispatch('pointermove', { clientX: 110, clientY: 70 });
		controller.dispose();
		frameCallback?.(16);

		expect(cancelFrame).toHaveBeenCalledWith(42);
		expect(target.removeEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
		expect(target.removeEventListener).toHaveBeenCalledWith('pointerout', expect.any(Function));
		expect(target.removeEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
		expect(updatePosition).not.toHaveBeenCalled();
	});
});

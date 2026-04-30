import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	createPointerPhysicsController,
	detectPointerPhysicsCapability,
	getLatestPointerEvent,
	type PointerLikeEvent,
	type PointerMoveEventName,
} from '../../src/motion/PointerPhysicsController.js';

function createTarget() {
	const listeners = new Map<PointerMoveEventName, EventListener>();
	const addEventListener = vi.fn(
		(type: PointerMoveEventName, listener: EventListener, _options?: AddEventListenerOptions) => {
			listeners.set(type, listener);
		},
	);
	const removeEventListener = vi.fn((type: PointerMoveEventName, listener: EventListener) => {
		if (listeners.get(type) === listener) {
			listeners.delete(type);
		}
	});

	return {
		addEventListener,
		dispatch(type: PointerMoveEventName, event: PointerLikeEvent) {
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
		expect(target.addEventListener).toHaveBeenCalledWith(
			'pointermove',
			expect.any(Function),
			{ passive: true },
		);

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
		expect(target.addEventListener).toHaveBeenCalledWith(
			'mousemove',
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
		expect(updatePosition).not.toHaveBeenCalled();
	});
});

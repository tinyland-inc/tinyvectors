import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScrollHandler } from '../../src/motion/ScrollHandler.js';

describe('ScrollHandler', () => {
	const frameCallbacks: FrameRequestCallback[] = [];

	beforeEach(() => {
		frameCallbacks.length = 0;
		vi.useFakeTimers();
		vi.setSystemTime(1_000);
		vi.stubGlobal(
			'requestAnimationFrame',
			vi.fn((callback: FrameRequestCallback) => {
				frameCallbacks.push(callback);
				return frameCallbacks.length;
			}),
		);
		vi.stubGlobal('cancelAnimationFrame', vi.fn());
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('converts wheel movement into stickiness and pull forces', () => {
		const handler = new ScrollHandler();

		handler.handleScroll({ deltaY: 240 } as WheelEvent);

		expect(handler.isActivelyScrolling()).toBe(true);
		expect(handler.getScrollDirection()).toBe(1);
		expect(handler.getTotalScrollDistance()).toBe(240);
		expect(handler.getStickiness()).toBeGreaterThan(0);
		expect(handler.getPullForces().length).toBeGreaterThan(0);
	});

	it('resets active scroll state after the quiet window', () => {
		const handler = new ScrollHandler();

		handler.handleScroll({ deltaY: 120 } as WheelEvent);
		vi.setSystemTime(1_201);
		vi.advanceTimersByTime(200);

		expect(handler.isActivelyScrolling()).toBe(false);
		expect(handler.getTotalScrollDistance()).toBe(0);
		expect(handler.getPeakVelocity()).toBe(0);
	});

	it('keeps a single decay loop active across repeated scroll events', () => {
		const handler = new ScrollHandler();

		handler.handleScroll({ deltaY: 120 } as WheelEvent);
		handler.handleScroll({ deltaY: 140 } as WheelEvent);

		expect(requestAnimationFrame).toHaveBeenCalledOnce();

		frameCallbacks[0](16);

		expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
	});

	it('cleans up scheduled decay and scroll-end work', () => {
		const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
		const handler = new ScrollHandler();

		handler.handleScroll({ deltaY: 120 } as WheelEvent);
		handler.dispose();
		frameCallbacks[0](16);

		expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
		expect(clearTimeoutSpy).toHaveBeenCalled();
		expect(handler.getStickiness()).toBe(0);
		expect(handler.isActivelyScrolling()).toBe(false);
		expect(handler.getPullForces()).toEqual([]);
	});

	it('ignores scroll events after disposal', () => {
		const handler = new ScrollHandler();

		handler.dispose();
		handler.handleScroll({ deltaY: 120 } as WheelEvent);

		expect(handler.getStickiness()).toBe(0);
		expect(requestAnimationFrame).not.toHaveBeenCalled();
	});
});

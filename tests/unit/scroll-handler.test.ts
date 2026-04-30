import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScrollHandler } from '../../src/motion/ScrollHandler.js';

describe('ScrollHandler RAF backpressure', () => {
	let nextId = 1;
	let scheduled: Map<number, FrameRequestCallback>;
	let cancelled: Set<number>;

	beforeEach(() => {
		nextId = 1;
		scheduled = new Map();
		cancelled = new Set();
		vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
			const id = nextId++;
			scheduled.set(id, cb);
			return id;
		});
		vi.stubGlobal('cancelAnimationFrame', (id: number) => {
			cancelled.add(id);
			scheduled.delete(id);
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('cancels in-flight decay before respawning under rapid scroll', () => {
		const h = new ScrollHandler();
		const fakeWheel = (deltaY: number) =>
			({ deltaY } as unknown as WheelEvent);

		for (let i = 0; i < 50; i++) {
			h.handleScroll(fakeWheel(100));
		}

		// Exactly one active RAF after 50 rapid handleScroll() calls.
		expect(scheduled.size).toBe(1);
		// And 49 prior RAFs were cancelled.
		expect(cancelled.size).toBe(49);
	});

	it('clears rafId when decay completes', () => {
		const h = new ScrollHandler();
		const fakeWheel = (deltaY: number) =>
			({ deltaY } as unknown as WheelEvent);

		// One scroll event kicks off decay.
		h.handleScroll(fakeWheel(50));
		expect(scheduled.size).toBe(1);

		// Drain all scheduled callbacks until decay self-terminates.
		// `decay` re-schedules itself only while stickiness > 0.01 or pullForces > 0.
		// With decayRate 0.92, this exits within a few hundred frames.
		let safety = 1000;
		while (scheduled.size > 0 && safety-- > 0) {
			const [[id, cb]] = scheduled.entries();
			scheduled.delete(id);
			cb(performance.now());
		}
		expect(scheduled.size).toBe(0);

		// A subsequent scroll should kick off a fresh decay (no cancel needed
		// because the previous loop exited cleanly).
		const cancelledBefore = cancelled.size;
		h.handleScroll(fakeWheel(50));
		expect(cancelled.size).toBe(cancelledBefore);
		expect(scheduled.size).toBe(1);
	});
});

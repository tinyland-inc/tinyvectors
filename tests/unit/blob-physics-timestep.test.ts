import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BlobPhysics } from '../../src/core/BlobPhysics.js';
import type { ConvexBlob } from '../../src/core/types.js';

// Deterministic xorshift32 PRNG so both cadences under test draw the exact
// same sequence of "random" values in the exact same order.
function seededRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state ^= state << 13;
		state >>>= 0;
		state ^= state >>> 17;
		state ^= state << 5;
		state >>>= 0;
		return state / 4294967296;
	};
}

let randomSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(0);
	randomSpy = vi.spyOn(Math, 'random');
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

async function countSubsteps(numFrames: number, frameDelta: number): Promise<number> {
	const physics = new BlobPhysics(0);
	await physics.init();

	let calls = 0;
	const internals = physics as unknown as { step: (deltaTime: number, time: number) => void };
	const originalStep = internals.step.bind(physics);
	internals.step = (deltaTime: number, time: number) => {
		calls++;
		originalStep(deltaTime, time);
	};

	for (let i = 0; i < numFrames; i++) {
		physics.tick(frameDelta, i * frameDelta);
	}

	return calls;
}

async function simulateTrajectory(numFrames: number, frameDelta: number): Promise<ConvexBlob[]> {
	randomSpy.mockImplementation(seededRandom(42));

	const physics = new BlobPhysics(3);
	await physics.init();

	for (let i = 0; i < numFrames; i++) {
		physics.tick(frameDelta, i * frameDelta);
	}

	return physics.getBlobs();
}

describe('BlobPhysics fixed-timestep accumulator (TIN-853)', () => {
	it('steps physics the same number of times over ~1s of elapsed time at 30/60/120Hz', async () => {
		const steps60 = await countSubsteps(60, 1 / 60);
		const steps120 = await countSubsteps(120, 1 / 120);
		const steps30 = await countSubsteps(30, 1 / 30);

		expect(steps60).toBe(60);
		expect(steps120).toBe(60);
		expect(steps30).toBe(60);
	});

	it('produces identical trajectories at 30/60/120Hz frame cadences for the same elapsed time', async () => {
		const blobs60 = await simulateTrajectory(60, 1 / 60);
		const blobs120 = await simulateTrajectory(120, 1 / 120);
		const blobs30 = await simulateTrajectory(30, 1 / 30);

		expect(blobs120).toEqual(blobs60);
		expect(blobs30).toEqual(blobs60);
	});

	it('does not step physics for a single sub-frame delta smaller than the fixed timestep', async () => {
		const steps = await countSubsteps(1, 1 / 240);
		expect(steps).toBe(0);
	});

	it('accumulates partial deltas across calls into whole steps', async () => {
		// Four quarter-steps of the 1/60s quantum should produce exactly one step.
		const steps = await countSubsteps(4, 1 / 240);
		expect(steps).toBe(1);
	});

	it('clamps a large catch-up delta (e.g. resuming after a paused/backgrounded tab) to the substep cap', async () => {
		const steps = await countSubsteps(1, 5);
		expect(steps).toBe(8);
	});

	it('carries the leftover remainder across calls instead of dropping it', async () => {
		const physics = new BlobPhysics(0);
		await physics.init();

		let calls = 0;
		const internals = physics as unknown as { step: (deltaTime: number, time: number) => void };
		const originalStep = internals.step.bind(physics);
		internals.step = (deltaTime: number, time: number) => {
			calls++;
			originalStep(deltaTime, time);
		};

		// 0.11s / (1/60s) = 6 whole steps with a ~0.01s remainder.
		physics.tick(0.11, 0);
		expect(calls).toBe(6);

		// Exactly enough more time to complete one more 1/60s step from the
		// carried remainder — if the remainder were dropped this would still
		// read 6.
		physics.tick(1 / 60 - 0.01, 0);
		expect(calls).toBe(7);
	});

	it('treats a NaN deltaTime as a no-op instead of freezing the accumulator forever (F3)', async () => {
		const physics = new BlobPhysics(0);
		await physics.init();

		let calls = 0;
		const internals = physics as unknown as { step: (deltaTime: number, time: number) => void };
		const originalStep = internals.step.bind(physics);
		internals.step = (deltaTime: number, time: number) => {
			calls++;
			originalStep(deltaTime, time);
		};

		// A single bad frame (e.g. NaN from a corrupt rAF timestamp) must not
		// poison the accumulator: Math.min/Math.max with NaN propagate NaN on
		// every subsequent call, which would permanently stop physics from
		// ever stepping again.
		physics.tick(NaN, 0);
		expect(calls).toBe(0);

		// Healthy ticks afterward must still accumulate and step normally.
		for (let i = 0; i < 60; i++) {
			physics.tick(1 / 60, i / 60);
		}
		expect(calls).toBe(60);
	});
});

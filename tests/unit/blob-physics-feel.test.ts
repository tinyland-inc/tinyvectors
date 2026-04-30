import { afterEach, describe, expect, it, vi } from 'vitest';

import { BlobPhysics } from '../../src/core/BlobPhysics.js';

const useDeterministicRandom = () => {
	let index = 0;
	const values = [0.13, 0.87, 0.31, 0.69, 0.47, 0.53, 0.22, 0.78];
	vi.spyOn(Math, 'random').mockImplementation(() => {
		const value = values[index % values.length];
		index += 1;
		return value;
	});
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe('BlobPhysics feel', () => {
	it('lets device gravity dominate ambient drift', async () => {
		useDeterministicRandom();

		const physics = new BlobPhysics(8);
		await physics.init();
		const before = physics.getBlobs().map((blob) => ({
			x: blob.currentX,
			y: blob.currentY,
		}));

		physics.setGravity({ x: 0, y: 1 });

		for (let frame = 0; frame < 180; frame++) {
			physics.tick(1 / 60, frame / 60);
		}

		const after = physics.getBlobs();
		const deltas = after.map((blob, index) => ({
			x: blob.currentX - before[index].x,
			y: blob.currentY - before[index].y,
		}));
		const downwardBlobs = deltas.filter((delta) => delta.y > 0).length;
		const averageY =
			deltas.reduce((total, delta) => total + delta.y, 0) / deltas.length;
		const averageAbsX =
			deltas.reduce((total, delta) => total + Math.abs(delta.x), 0) / deltas.length;

		expect(downwardBlobs).toBeGreaterThanOrEqual(6);
		expect(averageY).toBeGreaterThan(4);
		expect(averageY).toBeGreaterThan(averageAbsX);
	});

	it('does not turn steady device gravity into random deformation chaos', async () => {
		useDeterministicRandom();

		const physics = new BlobPhysics(1);
		await physics.init();
		physics.setGravity({ x: 0, y: 1 });

		for (let frame = 0; frame < 60; frame++) {
			physics.tick(1 / 60, frame / 60);
		}

		expect(physics.getBlobs()[0].chaosLevel).toBe(0);
	});
});

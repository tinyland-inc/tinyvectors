import { describe, expect, it } from 'vitest';

import {
	clampFieldVector,
	combineFieldVectors,
	directionalBiasField,
	pointAttractorField,
	smoothDistanceFalloff,
} from '../../src/core/InteractionField.js';

const vectorMagnitude = ({ x, y }: { x: number; y: number }) =>
	Math.sqrt(x * x + y * y);

describe('InteractionField', () => {
	it('clamps vectors without changing direction', () => {
		const vector = clampFieldVector({ x: 3, y: 4 }, 2);

		expect(vectorMagnitude(vector)).toBeCloseTo(2);
		expect(vector.x / vector.y).toBeCloseTo(3 / 4);
	});

	it('turns zero-sized clamp bounds into a zero vector', () => {
		expect(clampFieldVector({ x: 1, y: 1 }, 0)).toEqual({ x: 0, y: 0 });
		expect(clampFieldVector({ x: 1, y: 1 }, -1)).toEqual({ x: 0, y: 0 });
	});

	it('combines fields under a maximum magnitude', () => {
		const vector = combineFieldVectors(
			[
				{ x: 0.8, y: 0 },
				{ x: 0.8, y: 0 },
			],
			1,
		);

		expect(vector).toEqual({ x: 1, y: 0 });
	});

	it('converts gravity-like input into a bounded directional bias', () => {
		const vector = directionalBiasField({ x: 0.25, y: 1 }, 0.8, 0.5);

		expect(vector.y).toBeGreaterThan(0);
		expect(vectorMagnitude(vector)).toBeLessThanOrEqual(0.5);
	});

	it('uses smooth local falloff for point fields', () => {
		const atCenter = smoothDistanceFalloff(-5, 50);
		const near = smoothDistanceFalloff(10, 50);
		const far = smoothDistanceFalloff(40, 50);
		const outside = smoothDistanceFalloff(60, 50);

		expect(atCenter).toBe(1);
		expect(near).toBeGreaterThan(far);
		expect(far).toBeGreaterThan(0);
		expect(outside).toBe(0);
	});

	it('samples a soft pointer-style attraction toward the target', () => {
		const near = pointAttractorField({
			origin: { x: 40, y: 50 },
			target: { x: 50, y: 50 },
			radius: 30,
			strength: 0.2,
		});
		const far = pointAttractorField({
			origin: { x: 20, y: 50 },
			target: { x: 50, y: 50 },
			radius: 30,
			strength: 0.2,
		});

		expect(near.x).toBeGreaterThan(0);
		expect(Math.abs(near.y)).toBe(0);
		expect(vectorMagnitude(near)).toBeGreaterThan(vectorMagnitude(far));
		expect(far).toEqual({ x: 0, y: 0 });
	});
});

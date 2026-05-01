import { describe, it, expect } from 'vitest';
import { remapToScreen } from '../../src/motion/DeviceMotion.js';

describe('remapToScreen', () => {
	it('portrait (angle=0): gamma → screen-X, beta → screen-Y', () => {
		const [sx, sy] = remapToScreen(20, 30, 0);
		expect(sx).toBe(30); // gamma
		expect(sy).toBe(20); // beta
	});

	it('landscape-left (angle=90): beta → screen-X, -gamma → screen-Y', () => {
		const [sx, sy] = remapToScreen(20, 30, 90);
		expect(sx).toBe(20); // beta
		expect(sy).toBe(-30); // -gamma
	});

	it('upside-down portrait (angle=180): -gamma → screen-X, -beta → screen-Y', () => {
		const [sx, sy] = remapToScreen(20, 30, 180);
		expect(sx).toBe(-30);
		expect(sy).toBe(-20);
	});

	it('landscape-right (angle=270): -beta → screen-X, gamma → screen-Y', () => {
		const [sx, sy] = remapToScreen(20, 30, 270);
		expect(sx).toBe(-20);
		expect(sy).toBe(30);
	});

	it('unknown angle falls back to portrait mapping', () => {
		const [sx, sy] = remapToScreen(20, 30, 45);
		expect(sx).toBe(30);
		expect(sy).toBe(20);
	});

	it('preserves zero on flat-on-table input', () => {
		// Negation can produce -0 in JS; numerically equivalent to 0.
		for (const angle of [0, 90, 180, 270]) {
			const [sx, sy] = remapToScreen(0, 0, angle);
			expect(Math.abs(sx)).toBe(0);
			expect(Math.abs(sy)).toBe(0);
		}
	});
});

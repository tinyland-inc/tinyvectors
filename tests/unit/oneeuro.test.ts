import { describe, it, expect } from 'vitest';
import { OneEuro } from '../../src/motion/OneEuro.js';

describe('OneEuro', () => {
	it('passes through the first sample', () => {
		const f = new OneEuro({ minCutoff: 1, beta: 0, dCutoff: 1 });
		expect(f.filter(42, 0)).toBe(42);
	});

	it('with beta=0, output matches exact EMA formula at α(minCutoff, dt)', () => {
		const minCutoff = 1;
		const dtSec = 0.016;
		const tau = 1 / (2 * Math.PI * minCutoff);
		const expectedAlpha = 1 / (1 + tau / dtSec);

		const f = new OneEuro({ minCutoff, beta: 0, dCutoff: 1 });
		f.filter(0, 0);
		const out1 = f.filter(1.0, 16);
		expect(out1).toBeCloseTo(expectedAlpha, 5);
		const out2 = f.filter(1.0, 32);
		expect(out2).toBeCloseTo(expectedAlpha + (1 - expectedAlpha) * expectedAlpha, 5);
	});

	it('higher β responds faster to step inputs (adaptive cutoff)', () => {
		const slow = new OneEuro({ minCutoff: 0.5, beta: 0.001, dCutoff: 1 });
		const fast = new OneEuro({ minCutoff: 0.5, beta: 0.5, dCutoff: 1 });
		slow.filter(0, 0);
		fast.filter(0, 0);
		let lastSlow = 0;
		let lastFast = 0;
		for (let t = 16; t <= 200; t += 16) {
			lastSlow = slow.filter(100, t);
			lastFast = fast.filter(100, t);
		}
		expect(lastFast).toBeGreaterThan(lastSlow);
	});

	it('reset() restores first-sample-passthrough state', () => {
		const f = new OneEuro({ minCutoff: 1, beta: 0.1, dCutoff: 1 });
		f.filter(0, 0);
		f.filter(10, 16);
		f.filter(10, 32);
		f.reset();
		expect(f.filter(99, 100)).toBe(99);
	});

	it('clamps tiny dt so identical timestamps do not blow up', () => {
		const f = new OneEuro({ minCutoff: 1, beta: 0.01, dCutoff: 1 });
		f.filter(0, 100);
		expect(() => f.filter(1, 100)).not.toThrow();
		expect(Number.isFinite(f.filter(2, 100))).toBe(true);
	});
});

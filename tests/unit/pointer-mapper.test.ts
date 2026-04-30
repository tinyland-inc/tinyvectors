import { describe, expect, it } from 'vitest';

import { mapClientPointToPhysics } from '../../src/motion/PointerMapper.js';

describe('mapClientPointToPhysics', () => {
	const bounds = {
		left: 10,
		top: 20,
		width: 200,
		height: 100,
	};

	it('maps the center of a bounds rectangle into the center of physics space', () => {
		expect(mapClientPointToPhysics(110, 70, bounds)).toEqual({ x: 50, y: 50 });
	});

	it('maps rectangle corners into the default 0..100 physics range', () => {
		expect(mapClientPointToPhysics(10, 20, bounds)).toEqual({ x: 0, y: 0 });
		expect(mapClientPointToPhysics(210, 120, bounds)).toEqual({ x: 100, y: 100 });
	});

	it('clamps points outside the rectangle', () => {
		expect(mapClientPointToPhysics(-100, 200, bounds)).toEqual({ x: 0, y: 100 });
	});

	it('supports custom physics ranges', () => {
		expect(mapClientPointToPhysics(110, 70, bounds, { min: -40, max: 140 })).toEqual({
			x: 50,
			y: 50,
		});
		expect(mapClientPointToPhysics(210, 120, bounds, { min: -40, max: 140 })).toEqual({
			x: 140,
			y: 140,
		});
	});

	it('falls back to the center when bounds have no area', () => {
		expect(mapClientPointToPhysics(100, 100, { ...bounds, width: 0 })).toEqual({
			x: 50,
			y: 50,
		});
		expect(
			mapClientPointToPhysics(100, 100, { ...bounds, height: 0 }, { min: -40, max: 140 }),
		).toEqual({ x: 50, y: 50 });
	});
});

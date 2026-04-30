import { describe, it, expect } from 'vitest';
import { BlobPhysics } from '../../src/core/BlobPhysics.js';

describe('BlobPhysics.getBlobs reference stability', () => {
	it('returns a fresh array reference each call (so Svelte signals fire)', async () => {
		const physics = new BlobPhysics(5, {});
		await physics.init();
		const colors = ['red', 'green', 'blue', 'yellow', 'purple'];
		const a = physics.getBlobs(colors);
		const b = physics.getBlobs(colors);
		expect(a).not.toBe(b);
		expect(a).toEqual(b);
	});

	it('returns the same blob object references across calls (no per-frame spread)', async () => {
		const physics = new BlobPhysics(3, {});
		await physics.init();
		const colors = ['red', 'green', 'blue'];
		const a = physics.getBlobs(colors);
		const b = physics.getBlobs(colors);
		for (let i = 0; i < a.length; i++) {
			expect(a[i]).toBe(b[i]);
		}
	});

	it('applies themeColors via in-place mutation, cycling when shorter than blob count', async () => {
		const physics = new BlobPhysics(5, {});
		await physics.init();
		const colors = ['red', 'green'];
		const blobs = physics.getBlobs(colors);
		expect(blobs[0].color).toBe('red');
		expect(blobs[1].color).toBe('green');
		expect(blobs[2].color).toBe('red');
		expect(blobs[3].color).toBe('green');
		expect(blobs[4].color).toBe('red');
	});

	it('without themeColors still returns a fresh array of the same blobs', async () => {
		const physics = new BlobPhysics(2, {});
		await physics.init();
		const blobs1 = physics.getBlobs(['#aaa', '#bbb']);
		expect(blobs1[0].color).toBe('#aaa');
		// Calling without colors does not reset; previous theming remains.
		const blobs2 = physics.getBlobs();
		expect(blobs2).not.toBe(blobs1);
		expect(blobs2[0]).toBe(blobs1[0]);
		expect(blobs2[0].color).toBe('#aaa');
	});
});

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	prefersReducedMotion,
	watchReducedMotion,
} from '../../src/motion/reduced-motion.js';

function stubMatchMedia(initialMatches = false) {
	const state = { matches: initialMatches };
	const listeners = new Set<() => void>();
	const mediaQueryList = {
		get matches() {
			return state.matches;
		},
		addEventListener: (_type: string, listener: () => void) => {
			listeners.add(listener);
		},
		removeEventListener: (_type: string, listener: () => void) => {
			listeners.delete(listener);
		},
	};
	const matchMedia = vi.fn(() => mediaQueryList);
	vi.stubGlobal('matchMedia', matchMedia);
	return { matchMedia, state, listeners };
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('prefersReducedMotion', () => {
	it('returns false without a matchMedia implementation', () => {
		expect(prefersReducedMotion()).toBe(false);
	});

	it('reflects the current reduced-motion match state', () => {
		const { state } = stubMatchMedia(true);
		expect(prefersReducedMotion()).toBe(true);

		state.matches = false;
		expect(prefersReducedMotion()).toBe(false);
	});

	it('queries the reduced-motion media feature', () => {
		const { matchMedia } = stubMatchMedia();
		prefersReducedMotion();
		expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
	});
});

describe('watchReducedMotion', () => {
	it('returns a noop cleanup without a matchMedia implementation', () => {
		const callback = vi.fn();
		const cleanup = watchReducedMotion(callback);
		expect(callback).not.toHaveBeenCalled();
		expect(() => cleanup()).not.toThrow();
	});

	it('reports the initial state immediately', () => {
		stubMatchMedia(true);
		const callback = vi.fn();
		watchReducedMotion(callback);

		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenLastCalledWith(true);
	});

	it('notifies on live query changes and detaches on cleanup', () => {
		const { state, listeners } = stubMatchMedia(false);
		const callback = vi.fn();
		const cleanup = watchReducedMotion(callback);

		expect(callback).toHaveBeenLastCalledWith(false);
		expect(listeners.size).toBe(1);

		state.matches = true;
		for (const listener of listeners) listener();
		expect(callback).toHaveBeenLastCalledWith(true);

		state.matches = false;
		for (const listener of listeners) listener();
		expect(callback).toHaveBeenLastCalledWith(false);

		cleanup();
		expect(listeners.size).toBe(0);
	});
});

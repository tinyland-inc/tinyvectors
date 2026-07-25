import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	isDarkMode,
	resolveDark,
	watchDarkMode,
} from '../../src/themes/dark-mode.js';

interface DomOptions {
	classes?: string[];
	dataMode?: string | null;
	colorScheme?: string;
}

class FakeMutationObserver {
	static instances: FakeMutationObserver[] = [];

	callback: MutationCallback;
	observed: { target: unknown; options: MutationObserverInit }[] = [];
	disconnected = false;

	constructor(callback: MutationCallback) {
		this.callback = callback;
		FakeMutationObserver.instances.push(this);
	}

	observe(target: unknown, options: MutationObserverInit): void {
		this.observed.push({ target, options });
	}

	disconnect(): void {
		this.disconnected = true;
	}

	trigger(): void {
		this.callback([], this as unknown as MutationObserver);
	}
}

function stubDom({
	classes = [],
	dataMode = null,
	colorScheme = 'normal',
}: DomOptions = {}) {
	const state = { classes, dataMode, colorScheme };
	const documentElement = {
		classList: {
			contains: (name: string) => state.classes.includes(name),
		},
		getAttribute: (name: string) =>
			name === 'data-mode' ? state.dataMode : null,
	};

	vi.stubGlobal('document', { documentElement });
	vi.stubGlobal(
		'getComputedStyle',
		vi.fn(() => ({ colorScheme: state.colorScheme })),
	);

	return { documentElement, state };
}

function stubMatchMedia() {
	const listeners = new Set<() => void>();
	const mediaQueryList = {
		addEventListener: (_type: string, listener: () => void) => {
			listeners.add(listener);
		},
		removeEventListener: (_type: string, listener: () => void) => {
			listeners.delete(listener);
		},
	};
	const matchMedia = vi.fn(() => mediaQueryList);
	vi.stubGlobal('matchMedia', matchMedia);
	return { matchMedia, listeners };
}

afterEach(() => {
	vi.unstubAllGlobals();
	FakeMutationObserver.instances = [];
});

describe('isDarkMode', () => {
	it('returns false without a document', () => {
		expect(isDarkMode()).toBe(false);
	});

	it('detects the .dark root class alone (back-compat)', () => {
		stubDom({ classes: ['dark'] });
		expect(isDarkMode()).toBe(true);
	});

	it('detects data-mode="dark" without any .dark class', () => {
		stubDom({ dataMode: 'dark' });
		expect(isDarkMode()).toBe(true);
	});

	it('detects a computed color-scheme of dark', () => {
		stubDom({ colorScheme: 'dark' });
		expect(isDarkMode()).toBe(true);
	});

	it('returns false when no signal is dark', () => {
		stubDom({ classes: ['theme-rose'], dataMode: 'light' });
		expect(isDarkMode()).toBe(false);
	});
});

describe('resolveDark', () => {
	it('lets an explicit boolean override detection entirely', () => {
		expect(resolveDark(true, false)).toBe(true);
		expect(resolveDark(false, true)).toBe(false);
	});

	it('falls back to the detected signal for null and undefined', () => {
		expect(resolveDark(null, true)).toBe(true);
		expect(resolveDark(null, false)).toBe(false);
		expect(resolveDark(undefined, true)).toBe(true);
	});
});

describe('watchDarkMode', () => {
	it('returns a noop cleanup without a document', () => {
		const callback = vi.fn();
		const cleanup = watchDarkMode(callback);
		expect(callback).not.toHaveBeenCalled();
		expect(() => cleanup()).not.toThrow();
	});

	it('observes class and data-mode mutations and reports immediately', () => {
		const { documentElement, state } = stubDom({ classes: ['dark'] });
		stubMatchMedia();
		vi.stubGlobal('MutationObserver', FakeMutationObserver);

		const callback = vi.fn();
		const cleanup = watchDarkMode(callback);

		expect(callback).toHaveBeenLastCalledWith(true);

		const observer = FakeMutationObserver.instances[0];
		expect(observer.observed).toEqual([
			{
				target: documentElement,
				options: { attributes: true, attributeFilter: ['class', 'data-mode'] },
			},
		]);

		state.classes = [];
		state.dataMode = 'dark';
		observer.trigger();
		expect(callback).toHaveBeenLastCalledWith(true);

		state.dataMode = null;
		observer.trigger();
		expect(callback).toHaveBeenLastCalledWith(false);

		cleanup();
		expect(observer.disconnected).toBe(true);
	});

	it('listens to prefers-color-scheme changes and detaches on cleanup', () => {
		const { state } = stubDom();
		const { matchMedia, listeners } = stubMatchMedia();
		vi.stubGlobal('MutationObserver', FakeMutationObserver);

		const callback = vi.fn();
		const cleanup = watchDarkMode(callback);

		expect(matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
		expect(listeners.size).toBe(1);
		expect(callback).toHaveBeenLastCalledWith(false);

		state.colorScheme = 'dark';
		for (const listener of listeners) listener();
		expect(callback).toHaveBeenLastCalledWith(true);

		cleanup();
		expect(listeners.size).toBe(0);
	});
});

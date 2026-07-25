import { afterEach, describe, expect, it, vi } from 'vitest';

import { VisibilityGate } from '../../src/motion/VisibilityGate.js';

class FakeIntersectionObserver {
	static instances: FakeIntersectionObserver[] = [];

	callback: IntersectionObserverCallback;
	options: IntersectionObserverInit;
	observed: unknown[] = [];
	disconnected = false;

	constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
		this.callback = callback;
		this.options = options;
		FakeIntersectionObserver.instances.push(this);
	}

	observe(target: unknown): void {
		this.observed.push(target);
	}

	unobserve(): void {}

	disconnect(): void {
		this.disconnected = true;
	}

	trigger(isIntersecting: boolean): void {
		this.callback(
			[{ isIntersecting } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver,
		);
	}
}

function stubDocument(hidden = false) {
	const state = { hidden };
	const listeners = new Map<string, Set<() => void>>();
	const documentStub = {
		get hidden() {
			return state.hidden;
		},
		addEventListener: (type: string, listener: () => void) => {
			if (!listeners.has(type)) listeners.set(type, new Set());
			listeners.get(type)!.add(listener);
		},
		removeEventListener: (type: string, listener: () => void) => {
			listeners.get(type)?.delete(listener);
		},
	};
	vi.stubGlobal('document', documentStub);

	return {
		state,
		fireVisibilityChange: () => {
			for (const listener of listeners.get('visibilitychange') ?? []) listener();
		},
		listenerCount: (type: string) => listeners.get(type)?.size ?? 0,
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
	FakeIntersectionObserver.instances = [];
});

describe('VisibilityGate', () => {
	it('reports visible without a document (SSR-safe) and dispose is a no-op', () => {
		const onChange = vi.fn();
		const gate = new VisibilityGate(undefined, { onChange });

		expect(gate.isVisible()).toBe(true);
		expect(onChange).not.toHaveBeenCalled();
		expect(() => gate.dispose()).not.toThrow();
	});

	it('observes the element with threshold 0 and rootMargin 10% by default', () => {
		stubDocument();
		vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);

		const element = {} as Element;
		new VisibilityGate(element, { onChange: vi.fn() });

		const observer = FakeIntersectionObserver.instances[0];
		expect(observer.options).toEqual({ threshold: 0, rootMargin: '10%' });
		expect(observer.observed).toEqual([element]);
	});

	it('pauses when the tab is hidden and resumes when foregrounded', () => {
		const doc = stubDocument(false);
		vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);

		const onChange = vi.fn();
		const gate = new VisibilityGate({} as Element, { onChange });
		expect(gate.isVisible()).toBe(true);

		doc.state.hidden = true;
		doc.fireVisibilityChange();
		expect(onChange).toHaveBeenLastCalledWith(false);
		expect(gate.isVisible()).toBe(false);

		doc.state.hidden = false;
		doc.fireVisibilityChange();
		expect(onChange).toHaveBeenLastCalledWith(true);
		expect(gate.isVisible()).toBe(true);
	});

	it('pauses when the element leaves the viewport and resumes on re-entry', () => {
		stubDocument(false);
		vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);

		const onChange = vi.fn();
		const gate = new VisibilityGate({} as Element, { onChange });
		const observer = FakeIntersectionObserver.instances[0];

		observer.trigger(false);
		expect(onChange).toHaveBeenLastCalledWith(false);
		expect(gate.isVisible()).toBe(false);

		observer.trigger(true);
		expect(onChange).toHaveBeenLastCalledWith(true);
		expect(gate.isVisible()).toBe(true);
	});

	it('stays hidden while offscreen even if the tab is foregrounded, and vice versa', () => {
		const doc = stubDocument(false);
		vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);

		const gate = new VisibilityGate({} as Element, { onChange: vi.fn() });
		const observer = FakeIntersectionObserver.instances[0];

		observer.trigger(false);
		expect(gate.isVisible()).toBe(false);

		doc.state.hidden = true;
		doc.fireVisibilityChange();
		expect(gate.isVisible()).toBe(false);

		doc.state.hidden = false;
		doc.fireVisibilityChange();
		expect(gate.isVisible()).toBe(false);

		observer.trigger(true);
		expect(gate.isVisible()).toBe(true);
	});

	it('disposes cleanly: detaches the visibilitychange listener and disconnects the observer', () => {
		const doc = stubDocument(false);
		vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);

		const gate = new VisibilityGate({} as Element, { onChange: vi.fn() });
		const observer = FakeIntersectionObserver.instances[0];
		expect(doc.listenerCount('visibilitychange')).toBe(1);

		gate.dispose();

		expect(observer.disconnected).toBe(true);
		expect(doc.listenerCount('visibilitychange')).toBe(0);

		// A second dispose() call must stay a no-op.
		expect(() => gate.dispose()).not.toThrow();
	});

	it('skips IntersectionObserver setup without a global implementation', () => {
		stubDocument(false);
		expect(() => new VisibilityGate({} as Element, { onChange: vi.fn() })).not.toThrow();
	});

	it('accepts custom threshold and rootMargin', () => {
		stubDocument();
		vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);

		new VisibilityGate({} as Element, { onChange: vi.fn(), threshold: 0.5, rootMargin: '0%' });

		const observer = FakeIntersectionObserver.instances[0];
		expect(observer.options).toEqual({ threshold: 0.5, rootMargin: '0%' });
	});
});

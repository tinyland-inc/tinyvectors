// Combines two independent "is this actually on screen" signals into one:
// document.hidden (tab backgrounded) and IntersectionObserver (element
// scrolled out of the viewport). TinyVectors uses this to pause its rAF loop
// when neither signal says the element is visible, so a scrolled-past hero
// stops paying for physics/paint work it can't show. SSR-safe by
// construction: without a `document` the gate reports visible forever and
// dispose() is a no-op.

export interface VisibilityGateOptions {
	/** Called whenever the combined visible/hidden state changes. */
	onChange: (visible: boolean) => void;
	/** IntersectionObserver threshold. Defaults to 0 (any pixel visible). */
	threshold?: number;
	/** IntersectionObserver rootMargin. Defaults to '10%' (pause/resume slightly early). */
	rootMargin?: string;
}

export class VisibilityGate {
	private elementIntersecting = true;
	private observer: IntersectionObserver | null = null;
	private disposed = false;
	private readonly onChange: (visible: boolean) => void;
	private readonly boundVisibilityChange: () => void;

	constructor(element: Element | undefined, options: VisibilityGateOptions) {
		this.onChange = options.onChange;
		this.boundVisibilityChange = () => this.notify();

		if (typeof document === 'undefined') return;

		document.addEventListener('visibilitychange', this.boundVisibilityChange);

		if (element && typeof IntersectionObserver !== 'undefined') {
			this.observer = new IntersectionObserver(
				(entries) => {
					const entry = entries[entries.length - 1];
					if (!entry) return;
					this.elementIntersecting = entry.isIntersecting;
					this.notify();
				},
				{
					threshold: options.threshold ?? 0,
					rootMargin: options.rootMargin ?? '10%',
				},
			);
			this.observer.observe(element);
		}
	}

	isVisible(): boolean {
		const documentHidden = typeof document !== 'undefined' ? document.hidden : false;
		return !documentHidden && this.elementIntersecting;
	}

	private notify(): void {
		if (this.disposed) return;
		this.onChange(this.isVisible());
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;

		if (typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', this.boundVisibilityChange);
		}

		this.observer?.disconnect();
		this.observer = null;
	}
}

import { OneEuro } from './OneEuro.js';

export type DeviceMotionCallback = (data: {
	x: number;
	y: number;
	z: number;
}) => void;

export interface DeviceMotionOptions {
	/** One-Euro min cutoff (Hz). Lower = smoother at rest. Default 0.5. */
	oneEuroMinCutoff?: number;
	/** One-Euro speed-responsiveness. Default 0.01 (low for ambient). */
	oneEuroBeta?: number;
	/** One-Euro speed-estimate cutoff (Hz). Default 1.0. */
	oneEuroDCutoff?: number;
	/** Slow continuous baseline EMA. Default 0.0008 (~30 s τ). */
	baselineAlpha?: number;
	/** Discard events for the first N ms after first sample. Default 250. */
	warmupMs?: number;
	/** Suppress output when |beta| exceeds this. Default 120°. */
	faceDownThreshold?: number;
	/** Reset filter/baseline if event gap exceeds this. Default 2000 ms. */
	staleEventMs?: number;
	/** Degrees mapped to ±1. Default 45 (matches casual tilt range). */
	range?: number;
}

const DEFAULTS = {
	oneEuroMinCutoff: 0.5,
	oneEuroBeta: 0.01,
	oneEuroDCutoff: 1.0,
	baselineAlpha: 0.0008,
	warmupMs: 250,
	faceDownThreshold: 120,
	staleEventMs: 2000,
	range: 45,
} satisfies Required<DeviceMotionOptions>;

// Convert raw (beta, gamma) → screen-aligned (sx, sy) given
// screen.orientation.angle. sx is "left-right tilt felt by the user",
// sy is "front-back tilt felt by the user". Pure for unit tests.
export function remapToScreen(
	beta: number,
	gamma: number,
	angle: number
): [number, number] {
	switch (angle) {
		case 90:
			return [beta, -gamma];
		case 180:
			return [-gamma, -beta];
		case 270:
			return [-beta, gamma];
		case 0:
		default:
			return [gamma, beta];
	}
}

function clamp(v: number, lo: number, hi: number): number {
	return v < lo ? lo : v > hi ? hi : v;
}

type OrientationPermission = () => Promise<string>;
function getPermissionApi(): OrientationPermission | null {
	if (typeof DeviceOrientationEvent === 'undefined') return null;
	const fn = (
		DeviceOrientationEvent as unknown as { requestPermission?: OrientationPermission }
	).requestPermission;
	return typeof fn === 'function' ? fn : null;
}

// Replaces the previous raw-acceleration DeviceMotion implementation.
// Listens to DeviceOrientationEvent (OS-fused, low-noise) instead of
// DeviceMotionEvent.accelerationIncludingGravity. Filters with One-Euro
// for an ambient-feel adaptive low-pass; subtracts a slow baseline so
// resting pose (cable bias, pocket lean) is absorbed without killing
// gravity feel. Honors prefers-reduced-motion as a hard disable.
export class DeviceMotion {
	private callback: DeviceMotionCallback;
	private opts: Required<DeviceMotionOptions>;
	private isListening = false;
	private disposed = false;
	private filterX: OneEuro;
	private filterY: OneEuro;
	private baseX = 0;
	private baseY = 0;
	private firstEventAt = 0;
	private lastEventAt = 0;
	private boundOrientation: ((e: DeviceOrientationEvent) => void) | null = null;
	private boundVisibility: (() => void) | null = null;
	private reducedMotionMql: MediaQueryList | null = null;
	private reducedMotionListener: (() => void) | null = null;

	constructor(callback: DeviceMotionCallback, options: DeviceMotionOptions = {}) {
		this.callback = callback;
		this.opts = { ...DEFAULTS, ...options };
		const eu = {
			minCutoff: this.opts.oneEuroMinCutoff,
			beta: this.opts.oneEuroBeta,
			dCutoff: this.opts.oneEuroDCutoff,
		};
		this.filterX = new OneEuro(eu);
		this.filterY = new OneEuro(eu);
	}

	async initialize(): Promise<void> {
		if (this.disposed) return;
		if (typeof window === 'undefined') return;
		if (!window.isSecureContext) {
			console.warn('DeviceMotion APIs require a secure context (HTTPS)');
			return;
		}
		if (!('DeviceOrientationEvent' in window)) {
			console.log('DeviceOrientationEvent not supported');
			return;
		}

		// prefers-reduced-motion is a hard disable. Subscribe to changes so
		// we honor a runtime toggle (Apple users can flip this from Control
		// Center) — but never auto-listen until explicitly initialized.
		this.reducedMotionMql =
			window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
		this.reducedMotionListener = () => {
			if (this.disposed || !this.reducedMotionMql) return;
			if (this.reducedMotionMql.matches && this.isListening) {
				this.stopListening();
			} else if (!this.reducedMotionMql.matches && !this.isListening) {
				// Re-engage if user disabled reduced-motion mid-session.
				// requestPermission() handles the no-API case internally.
				// Guard against post-cleanup resolution: iOS may have a
				// permission prompt open when cleanup() fires.
				void this.requestPermission().then((ok) => {
					if (ok && !this.disposed) this.startListening();
				});
			}
		};
		this.reducedMotionMql?.addEventListener('change', this.reducedMotionListener);

		if (this.reducedMotionMql?.matches) return;

		const ok = await this.requestPermission();
		if (ok && !this.disposed) this.startListening();
	}

	async requestPermission(): Promise<boolean> {
		const api = getPermissionApi();
		if (!api) return true;
		try {
			const r = await api();
			return r === 'granted';
		} catch (err) {
			console.error('Error requesting device orientation permission:', err);
			return false;
		}
	}

	private startListening(): void {
		if (this.isListening) return;
		this.boundOrientation = (e: DeviceOrientationEvent) => this.handle(e);
		window.addEventListener('deviceorientation', this.boundOrientation, {
			passive: true,
		} as AddEventListenerOptions);

		this.boundVisibility = () => {
			if (document.hidden) this.resetFilterState();
		};
		document.addEventListener('visibilitychange', this.boundVisibility);

		this.isListening = true;
	}

	private stopListening(): void {
		if (!this.isListening) return;
		if (this.boundOrientation) {
			window.removeEventListener('deviceorientation', this.boundOrientation);
			this.boundOrientation = null;
		}
		if (this.boundVisibility) {
			document.removeEventListener('visibilitychange', this.boundVisibility);
			this.boundVisibility = null;
		}
		this.isListening = false;
	}

	private resetFilterState(): void {
		this.filterX.reset();
		this.filterY.reset();
		this.firstEventAt = 0;
		this.lastEventAt = 0;
	}

	private handle(event: DeviceOrientationEvent): void {
		if (event.beta == null || event.gamma == null) return;

		const now =
			typeof performance !== 'undefined' ? performance.now() : Date.now();

		if (this.firstEventAt === 0) this.firstEventAt = now;
		if (now - this.firstEventAt < this.opts.warmupMs) return;

		if (
			this.lastEventAt > 0 &&
			now - this.lastEventAt > this.opts.staleEventMs
		) {
			this.resetFilterState();
			this.firstEventAt = now;
			this.lastEventAt = now;
			return;
		}
		this.lastEventAt = now;

		// Face-down or upside-down: emit zero rather than wild values.
		if (Math.abs(event.beta) > this.opts.faceDownThreshold) {
			this.callback({ x: 0, y: 0, z: 0 });
			return;
		}

		const angle =
			(typeof screen !== 'undefined' && screen.orientation?.angle) || 0;
		const [sx, sy] = remapToScreen(event.beta, event.gamma, angle);

		// Slow continuous baseline absorbs cable bias / pocket lean over
		// ~30 s without killing gravity feel.
		const a = this.opts.baselineAlpha;
		this.baseX += a * (sx - this.baseX);
		this.baseY += a * (sy - this.baseY);

		const range = this.opts.range;
		const xRaw = (sx - this.baseX) / range;
		const yRaw = (sy - this.baseY) / range;

		const xFiltered = this.filterX.filter(xRaw, now);
		const yFiltered = this.filterY.filter(yRaw, now);

		this.callback({
			x: clamp(xFiltered, -1, 1),
			y: clamp(yFiltered, -1, 1),
			z: 0,
		});
	}

	cleanup(): void {
		// Set disposed first so any in-flight requestPermission() promise
		// that resolves after cleanup() short-circuits before re-attaching
		// a deviceorientation listener (iOS keeps the permission prompt
		// open across tab navigation; the user can dismiss after the
		// component has unmounted).
		this.disposed = true;
		this.stopListening();
		if (this.reducedMotionMql && this.reducedMotionListener) {
			this.reducedMotionMql.removeEventListener(
				'change',
				this.reducedMotionListener
			);
		}
		this.reducedMotionMql = null;
		this.reducedMotionListener = null;
		this.resetFilterState();
	}
}

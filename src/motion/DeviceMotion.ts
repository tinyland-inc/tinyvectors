import { OneEuro } from './OneEuro.js';

export interface MotionVector {
	x: number;
	y: number;
	z: number;
}

export type DeviceMotionCallback = (data: MotionVector) => void;

export type DeviceMotionPermissionState =
	| 'unknown'
	| 'unsupported'
	| 'insecure'
	| 'prompt'
	| 'granted'
	| 'denied';

export interface DeviceMotionOptions {
	/** One-Euro min cutoff (Hz). Lower = smoother at rest. Default 0.5. */
	oneEuroMinCutoff?: number;
	/** One-Euro speed responsiveness. Default 0.01 for ambient backgrounds. */
	oneEuroBeta?: number;
	/** One-Euro speed-estimate cutoff (Hz). Default 1.0. */
	oneEuroDCutoff?: number;
	/** Slow continuous baseline EMA. Default 0.0008, roughly 30 s tau. */
	baselineAlpha?: number;
	/** Discard events for the first N ms after listener startup. Default 250. */
	warmupMs?: number;
	/** Suppress output when |beta| exceeds this. Default 120 degrees. */
	faceDownThreshold?: number;
	/** Reset filters if event gap exceeds this. Default 2000 ms. */
	staleEventMs?: number;
	/** Degrees mapped to +/-1. Default 45, matching casual tilt range. */
	range?: number;
	/** Manual calibration sample count used by calibrate(). Default 8. */
	calibrationSamples?: number;
	/** Values smaller than this are treated as rest-state noise. Default 0.015. */
	deadZone?: number;
}

interface MotionWindow {
	DeviceOrientationEvent?: {
		requestPermission?: () => Promise<'granted' | 'denied'>;
	};
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
	calibrationSamples: 8,
	deadZone: 0.015,
} satisfies Required<DeviceMotionOptions>;

// Convert raw (beta, gamma) to screen-aligned tilt. sx is left/right
// tilt as felt by the user; sy is front/back tilt as felt by the user.
export function remapToScreen(beta: number, gamma: number, angle: number): [number, number] {
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

function clamp(value: number, min = -1, max = 1): number {
	return Math.max(min, Math.min(max, value));
}

function applyDeadZone(value: number, deadZone: number): number {
	return Math.abs(value) < deadZone ? 0 : value;
}

function getPermissionApi(): (() => Promise<'granted' | 'denied'>) | null {
	if (typeof window === 'undefined') return null;
	const constructor = (window as unknown as MotionWindow).DeviceOrientationEvent;
	const requestPermission = constructor?.requestPermission;
	return typeof requestPermission === 'function' ? requestPermission.bind(constructor) : null;
}

function getScreenOrientationAngle(): number {
	if (typeof screen === 'undefined') return 0;
	return screen.orientation?.angle ?? 0;
}

export class DeviceMotion {
	private readonly callback: DeviceMotionCallback;
	private readonly opts: Required<DeviceMotionOptions>;
	private readonly filterX: OneEuro;
	private readonly filterY: OneEuro;
	private permissionState: DeviceMotionPermissionState = 'unknown';
	private isListening = false;
	private disposed = false;
	private listenerStartedAt = 0;
	private lastEventAt = 0;
	private baseX = 0;
	private baseY = 0;
	private lastScreen: { x: number; y: number } | null = null;
	private calibrationRemaining = 0;
	private calibrationTargetSamples = 0;
	private calibrationTotalX = 0;
	private calibrationTotalY = 0;
	private boundOrientation: ((event: DeviceOrientationEvent) => void) | null = null;
	private boundVisibility: (() => void) | null = null;
	private reducedMotionMql: MediaQueryList | null = null;
	private reducedMotionListener: (() => void) | null = null;

	constructor(callback: DeviceMotionCallback, options: DeviceMotionOptions = {}) {
		this.callback = callback;
		this.opts = { ...DEFAULTS, ...options };
		const params = {
			minCutoff: this.opts.oneEuroMinCutoff,
			beta: this.opts.oneEuroBeta,
			dCutoff: this.opts.oneEuroDCutoff,
		};
		this.filterX = new OneEuro(params);
		this.filterY = new OneEuro(params);
	}

	async initialize(): Promise<boolean> {
		if (!this.detectSupport()) return false;
		this.observeReducedMotion();

		if (this.prefersReducedMotion()) {
			this.permissionState = 'denied';
			this.stopListening();
			return false;
		}

		if (getPermissionApi()) {
			this.permissionState = 'prompt';
			return false;
		}

		this.permissionState = 'granted';
		this.startListening();
		return true;
	}

	async requestPermission(): Promise<boolean> {
		if (!this.detectSupport()) return false;
		this.observeReducedMotion();

		if (this.prefersReducedMotion()) {
			this.permissionState = 'denied';
			this.stopListening();
			return false;
		}

		const requestPermission = getPermissionApi();
		if (requestPermission) {
			this.permissionState = 'prompt';
			try {
				this.permissionState = await requestPermission();
			} catch {
				this.permissionState = 'denied';
			}
		} else {
			this.permissionState = 'granted';
		}

		if (this.permissionState !== 'granted' || this.disposed) {
			this.stopListening();
			return false;
		}

		this.startListening();
		return true;
	}

	calibrate(samples = this.opts.calibrationSamples): void {
		const sampleCount = Math.max(0, Math.floor(samples));
		this.resetFilterState();

		if (sampleCount === 0) {
			if (this.lastScreen) {
				this.baseX = this.lastScreen.x;
				this.baseY = this.lastScreen.y;
			}
			this.calibrationRemaining = 0;
			return;
		}

		this.calibrationRemaining = sampleCount;
		this.calibrationTargetSamples = sampleCount;
		this.calibrationTotalX = 0;
		this.calibrationTotalY = 0;
	}

	getPermissionState(): DeviceMotionPermissionState {
		return this.permissionState;
	}

	isActive(): boolean {
		return this.isListening;
	}

	cleanup(): void {
		this.disposed = true;
		this.stopListening();

		if (this.reducedMotionMql && this.reducedMotionListener) {
			this.reducedMotionMql.removeEventListener('change', this.reducedMotionListener);
		}
		this.reducedMotionMql = null;
		this.reducedMotionListener = null;
		this.resetFilterState();
	}

	private detectSupport(): boolean {
		if (this.disposed) return false;

		if (typeof window === 'undefined') {
			this.permissionState = 'unsupported';
			return false;
		}

		if (!window.isSecureContext) {
			this.permissionState = 'insecure';
			return false;
		}

		if (!('DeviceOrientationEvent' in window)) {
			this.permissionState = 'unsupported';
			return false;
		}

		return true;
	}

	private observeReducedMotion(): void {
		if (this.reducedMotionMql || typeof window === 'undefined') return;

		this.reducedMotionMql = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
		this.reducedMotionListener = () => {
			if (this.disposed || !this.reducedMotionMql) return;

			if (this.reducedMotionMql.matches) {
				this.stopListening();
				return;
			}

			if (this.permissionState === 'granted') {
				this.startListening();
			}
		};
		this.reducedMotionMql?.addEventListener('change', this.reducedMotionListener);
	}

	private prefersReducedMotion(): boolean {
		return this.reducedMotionMql?.matches ?? false;
	}

	private startListening(): void {
		if (this.disposed || this.isListening || typeof window === 'undefined') return;

		this.boundOrientation = (event: DeviceOrientationEvent) => this.handleOrientation(event);
		window.addEventListener('deviceorientation', this.boundOrientation, { passive: true });

		this.boundVisibility = () => {
			if (document.hidden) this.resetFilterState();
		};
		document.addEventListener('visibilitychange', this.boundVisibility);

		this.listenerStartedAt = this.now();
		this.lastEventAt = 0;
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

	private handleOrientation(event: DeviceOrientationEvent): void {
		if (this.disposed || event.beta == null || event.gamma == null) return;

		const now = this.now();
		if (now - this.listenerStartedAt < this.opts.warmupMs) return;

		if (this.lastEventAt > 0 && now - this.lastEventAt > this.opts.staleEventMs) {
			this.resetFilterState();
			this.listenerStartedAt = now;
			this.lastEventAt = now;
			return;
		}
		this.lastEventAt = now;

		if (Math.abs(event.beta) > this.opts.faceDownThreshold) {
			this.callback({ x: 0, y: 0, z: 0 });
			return;
		}

		const [screenX, screenY] = remapToScreen(
			event.beta,
			event.gamma,
			getScreenOrientationAngle(),
		);
		this.lastScreen = { x: screenX, y: screenY };

		if (!this.consumeCalibrationSample(screenX, screenY)) return;

		const alpha = this.opts.baselineAlpha;
		this.baseX += alpha * (screenX - this.baseX);
		this.baseY += alpha * (screenY - this.baseY);

		const xRaw = (screenX - this.baseX) / this.opts.range;
		const yRaw = (screenY - this.baseY) / this.opts.range;
		const xFiltered = this.filterX.filter(xRaw, now);
		const yFiltered = this.filterY.filter(yRaw, now);

		this.callback({
			x: applyDeadZone(clamp(xFiltered), this.opts.deadZone),
			y: applyDeadZone(clamp(yFiltered), this.opts.deadZone),
			z: 0,
		});
	}

	private consumeCalibrationSample(screenX: number, screenY: number): boolean {
		if (this.calibrationRemaining <= 0) return true;

		this.calibrationTotalX += screenX;
		this.calibrationTotalY += screenY;
		this.calibrationRemaining -= 1;

		if (this.calibrationRemaining > 0) return false;

		const sampleCount = Math.max(1, this.calibrationTargetSamples);
		this.baseX = this.calibrationTotalX / sampleCount;
		this.baseY = this.calibrationTotalY / sampleCount;
		this.calibrationTotalX = 0;
		this.calibrationTotalY = 0;
		this.resetFilterState();
		return false;
	}

	private resetFilterState(): void {
		this.filterX.reset();
		this.filterY.reset();
		this.listenerStartedAt = this.now();
		this.lastEventAt = 0;
	}

	private now(): number {
		return typeof performance !== 'undefined' ? performance.now() : Date.now();
	}
}

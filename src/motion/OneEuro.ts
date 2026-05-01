// One-Euro filter — Casiez, Roussel & Vogel, CHI 2012.

const TAU = (fc: number) => 1 / (2 * Math.PI * fc);
const alpha = (fc: number, dt: number) => 1 / (1 + TAU(fc) / dt);

class LowPass {
	private y: number | undefined;

	filter(x: number, a: number): number {
		this.y = this.y === undefined ? x : a * x + (1 - a) * this.y;
		return this.y;
	}

	reset(): void {
		this.y = undefined;
	}
}

export interface OneEuroParams {
	/** Hz — cutoff at zero velocity. Lower = smoother at rest. */
	minCutoff: number;
	/** Hz/(unit/s) — cutoff increase per unit of speed. Higher = faster response. */
	beta: number;
	/** Hz — speed-estimate smoothing cutoff. */
	dCutoff: number;
}

export class OneEuro {
	private x = new LowPass();
	private dx = new LowPass();
	private prevX: number | undefined;
	private prevT: number | undefined;

	constructor(private p: OneEuroParams) {
		if (p.minCutoff <= 0 || p.dCutoff <= 0) {
			throw new RangeError('OneEuro: minCutoff and dCutoff must be > 0');
		}
	}

	/** Filter sample `x` at time `tMs` (milliseconds). */
	filter(x: number, tMs: number): number {
		if (this.prevT === undefined || this.prevX === undefined) {
			this.prevT = tMs;
			this.prevX = x;
			return this.x.filter(x, 1);
		}
		// tMs must be monotonically non-decreasing; backward jumps clamp to 1 ms.
		const dt = Math.max(1e-3, (tMs - this.prevT) / 1000);
		const dxRaw = (x - this.prevX) / dt;
		const dxHat = this.dx.filter(dxRaw, alpha(this.p.dCutoff, dt));
		const fc = this.p.minCutoff + this.p.beta * Math.abs(dxHat);
		const xHat = this.x.filter(x, alpha(fc, dt));
		this.prevX = x;
		this.prevT = tMs;
		return xHat;
	}

	reset(): void {
		this.x.reset();
		this.dx.reset();
		this.prevX = this.prevT = undefined;
	}
}

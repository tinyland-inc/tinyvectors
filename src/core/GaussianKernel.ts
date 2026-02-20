/**
 * Gaussian Kernel for smooth control point convolution
 *
 * Replaces simple 3-point averaging with proper Gaussian smoothing
 * that preserves shape continuity and reduces high-frequency noise.
 */

import type { ControlPoint } from './types.js';

export class GaussianKernel {
	private weights: Float32Array;
	private halfSize: number;
	private size: number;

	/**
	 * Create a Gaussian kernel
	 * @param size - Kernel size (must be odd, e.g., 3, 5, 7)
	 * @param sigma - Standard deviation (higher = more smoothing)
	 */
	constructor(size: number = 5, sigma: number = 1.0) {
		// Ensure odd size
		this.size = size % 2 === 0 ? size + 1 : size;
		this.halfSize = Math.floor(this.size / 2);
		this.weights = new Float32Array(this.size);

		this.computeWeights(sigma);
	}

	/**
	 * Compute normalized Gaussian weights
	 */
	private computeWeights(sigma: number): void {
		let sum = 0;
		const twoSigmaSquared = 2 * sigma * sigma;

		for (let i = 0; i < this.size; i++) {
			const x = i - this.halfSize;
			const weight = Math.exp(-(x * x) / twoSigmaSquared);
			this.weights[i] = weight;
			sum += weight;
		}

		// Normalize so weights sum to 1
		for (let i = 0; i < this.size; i++) {
			this.weights[i] /= sum;
		}
	}

	/**
	 * Convolve control point radii with Gaussian kernel
	 * Uses circular buffer wrap-around for closed shapes
	 *
	 * @param points - Array of control points to smooth (mutates in place)
	 */
	convolve(points: ControlPoint[]): void {
		const n = points.length;
		if (n < 3) return;

		// Copy original radii to avoid reading modified values
		const originalRadii = new Float32Array(n);
		for (let i = 0; i < n; i++) {
			originalRadii[i] = points[i].radius;
		}

		// Apply kernel with circular wrap
		for (let i = 0; i < n; i++) {
			let smoothedRadius = 0;

			for (let j = 0; j < this.size; j++) {
				// Circular index wrap-around
				const idx = (i + j - this.halfSize + n) % n;
				smoothedRadius += originalRadii[idx] * this.weights[j];
			}

			points[i].radius = smoothedRadius;
		}
	}

	/**
	 * Convolve a Float32Array of radii (for worker/WASM use)
	 *
	 * @param radii - Array of radii values
	 * @param count - Number of control points
	 * @returns New Float32Array with smoothed values
	 */
	convolveArray(radii: Float32Array, count: number): Float32Array {
		const result = new Float32Array(count);

		for (let i = 0; i < count; i++) {
			let smoothedRadius = 0;

			for (let j = 0; j < this.size; j++) {
				const idx = (i + j - this.halfSize + count) % count;
				smoothedRadius += radii[idx] * this.weights[j];
			}

			result[i] = smoothedRadius;
		}

		return result;
	}

	/**
	 * Get the kernel weights (for debugging/testing)
	 */
	getWeights(): Float32Array {
		return this.weights;
	}

	/**
	 * Get kernel size
	 */
	getSize(): number {
		return this.size;
	}

	/**
	 * Compute variance of radii array (for PBT testing)
	 */
	static computeVariance(radii: number[] | Float32Array): number {
		const n = radii.length;
		if (n === 0) return 0;

		let sum = 0;
		for (let i = 0; i < n; i++) {
			sum += radii[i];
		}
		const mean = sum / n;

		let variance = 0;
		for (let i = 0; i < n; i++) {
			const diff = radii[i] - mean;
			variance += diff * diff;
		}

		return variance / n;
	}
}

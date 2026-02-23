






import type { ControlPoint } from './types.js';

export class GaussianKernel {
	private weights: Float32Array;
	private halfSize: number;
	private size: number;

	




	constructor(size: number = 5, sigma: number = 1.0) {
		
		this.size = size % 2 === 0 ? size + 1 : size;
		this.halfSize = Math.floor(this.size / 2);
		this.weights = new Float32Array(this.size);

		this.computeWeights(sigma);
	}

	


	private computeWeights(sigma: number): void {
		let sum = 0;
		const twoSigmaSquared = 2 * sigma * sigma;

		for (let i = 0; i < this.size; i++) {
			const x = i - this.halfSize;
			const weight = Math.exp(-(x * x) / twoSigmaSquared);
			this.weights[i] = weight;
			sum += weight;
		}

		
		for (let i = 0; i < this.size; i++) {
			this.weights[i] /= sum;
		}
	}

	





	convolve(points: ControlPoint[]): void {
		const n = points.length;
		if (n < 3) return;

		
		const originalRadii = new Float32Array(n);
		for (let i = 0; i < n; i++) {
			originalRadii[i] = points[i].radius;
		}

		
		for (let i = 0; i < n; i++) {
			let smoothedRadius = 0;

			for (let j = 0; j < this.size; j++) {
				
				const idx = (i + j - this.halfSize + n) % n;
				smoothedRadius += originalRadii[idx] * this.weights[j];
			}

			points[i].radius = smoothedRadius;
		}
	}

	






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

	


	getWeights(): Float32Array {
		return this.weights;
	}

	


	getSize(): number {
		return this.size;
	}

	


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

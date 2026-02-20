/**
 * ScrollHandler - Scroll velocity and physics tracking
 *
 * Tracks scroll events and generates "pull forces" for blob animations.
 */

export interface ScrollHandlerConfig {
	decayRate?: number;
	maxForces?: number;
}

export type { PullForce } from '../core/types.js';
import type { PullForce } from '../core/types.js';

export class ScrollHandler {
	private stickiness = 0;
	private lastScrollTime = 0;
	private scrollVelocity = 0;
	private decayRate = 0.92;
	private totalScrollDistance = 0;
	private scrollStartTime = 0;
	private isScrolling = false;
	private scrollDirection = 0;
	private pullForces: PullForce[] = [];
	private peakVelocity = 0;

	constructor(config?: ScrollHandlerConfig) {
		if (config?.decayRate) this.decayRate = config.decayRate;
	}

	public handleScroll(event: WheelEvent): void {
		const currentTime = Date.now();
		const deltaTime = currentTime - this.lastScrollTime;

		this.scrollDirection = event.deltaY > 0 ? 1 : -1;

		if (!this.isScrolling || deltaTime > 200) {
			this.isScrolling = true;
			this.scrollStartTime = currentTime;
			this.totalScrollDistance = 0;
			this.peakVelocity = 0;
		}

		this.totalScrollDistance += Math.abs(event.deltaY);

		const scrollSpeed = Math.abs(event.deltaY) / Math.max(deltaTime, 16);
		this.peakVelocity = Math.max(this.peakVelocity, scrollSpeed);
		this.scrollVelocity = this.scrollVelocity * 0.7 + scrollSpeed * 0.3;

		const speedStickiness = Math.min(this.scrollVelocity / 1.5, 2);
		const distanceStickiness = Math.min(this.totalScrollDistance / 400, 2.5);

		const explosiveThreshold = speedStickiness * distanceStickiness;
		const isExplosive =
			explosiveThreshold > 2.0 || (speedStickiness > 1.2 && distanceStickiness > 1.0);

		let targetStickiness = Math.max(speedStickiness, distanceStickiness * 0.9);
		if (isExplosive) {
			targetStickiness = Math.min(targetStickiness * 1.8, 4.0);
		}

		this.stickiness = Math.max(this.stickiness, targetStickiness);

		if (speedStickiness > 0.3 || distanceStickiness > 0.3 || isExplosive) {
			this.generatePullForce(speedStickiness, distanceStickiness, this.scrollDirection, isExplosive);
		}

		this.lastScrollTime = currentTime;
		this.startDecay();

		setTimeout(() => {
			if (currentTime - this.lastScrollTime >= 200) {
				this.isScrolling = false;
				this.totalScrollDistance = 0;
				this.peakVelocity = 0;
			}
		}, 200);
	}

	private generatePullForce(
		speedStickiness: number,
		distanceStickiness: number,
		direction: number,
		explosive: boolean
	): void {
		if (direction <= 0 || speedStickiness > 0.4 || distanceStickiness > 0.4 || explosive) {
			let pullStrength = speedStickiness + distanceStickiness * 0.7;

			if (explosive) {
				pullStrength = Math.min(pullStrength * 2.5, 8.0);
			} else {
				pullStrength = Math.min(pullStrength, 3.0);
			}

			const randomnessFactor = explosive
				? 0.6 + Math.random() * 0.4
				: 0.4 + Math.random() * 0.5;

			this.pullForces.push({
				strength: pullStrength,
				time: 0,
				randomness: randomnessFactor,
				explosive: explosive,
			});

			if (this.pullForces.length > (explosive ? 10 : 8)) {
				this.pullForces.shift();
			}
		}
	}

	private startDecay(): void {
		const decay = () => {
			this.stickiness *= this.decayRate;
			this.scrollVelocity *= this.decayRate;

			this.pullForces = this.pullForces
				.filter((force) => {
					force.time += 0.016;
					const maxDuration = force.explosive ? 3.5 : 2.0;
					return force.time < maxDuration;
				})
				.map((force) => ({
					...force,
					strength: force.strength * (force.explosive ? 0.995 : 0.98),
				}));

			if (this.stickiness > 0.01 || this.pullForces.length > 0) {
				requestAnimationFrame(decay);
			} else {
				this.stickiness = 0;
				this.scrollVelocity = 0;
			}
		};
		requestAnimationFrame(decay);
	}

	public getStickiness(): number {
		return this.stickiness;
	}

	public getScrollVelocity(): number {
		return this.scrollVelocity;
	}

	public getTotalScrollDistance(): number {
		return this.totalScrollDistance;
	}

	public getPullForces(): PullForce[] {
		return this.pullForces;
	}

	public getScrollDirection(): number {
		return this.scrollDirection;
	}

	public isActivelyScrolling(): boolean {
		return this.isScrolling;
	}

	public getPeakVelocity(): number {
		return this.peakVelocity;
	}
}

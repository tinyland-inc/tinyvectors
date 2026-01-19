/**
 * Spring-Damper System for Gel Physics
 *
 * Implements realistic gel deformation using mass-spring-damper model.
 * Each control point is a mass connected by springs to:
 * 1. Its rest position (baseRadius)
 * 2. Neighboring control points (coupling)
 * 3. Global pressure (outward force)
 *
 * F_total = F_spring + F_tension + F_pressure + F_coupling + F_damping
 */

import type { ControlPoint, ControlPointVelocity } from './types.js';

/**
 * Extended control point with spring physics properties
 */
export interface GelControlPoint extends ControlPoint {
	// Spring properties
	springConstant: number; // k - stiffness to base radius
	dampingCoeff: number; // c - velocity damping
	couplingStrength: number; // Spring constant to neighbors
	mass: number; // Mass (affects acceleration)

	// State
	radialVelocity: number;
	angularVelocity: number;
}

/**
 * Spring system configuration
 */
export interface SpringConfig {
	/** Spring constant for return to base radius (0.01 - 0.5) */
	springConstant: number;
	/** Damping coefficient for velocity decay (0.01 - 0.3) */
	dampingCoeff: number;
	/** Coupling strength between neighbors (0.01 - 0.2) */
	couplingStrength: number;
	/** Surface tension toward circular shape (0.0 - 0.1) */
	surfaceTension: number;
	/** Internal pressure (0.5 - 2.0, 1.0 = neutral) */
	pressure: number;
	/** Maximum radius deviation from base (0.1 - 0.5) */
	maxDeformation: number;
	/** Maximum velocity (prevents explosion) */
	maxVelocity: number;
}

export const DEFAULT_SPRING_CONFIG: SpringConfig = {
	springConstant: 0.08,
	dampingCoeff: 0.12,
	couplingStrength: 0.05,
	surfaceTension: 0.03,
	pressure: 1.0,
	maxDeformation: 0.3,
	maxVelocity: 2.0,
};

/**
 * Spring System for gel-like control point deformation
 */
export class SpringSystem {
	private config: SpringConfig;

	constructor(config: Partial<SpringConfig> = {}) {
		this.config = { ...DEFAULT_SPRING_CONFIG, ...config };
	}

	/**
	 * Update a single control point using spring physics
	 *
	 * @param point - Control point to update
	 * @param velocity - Velocity state for the control point
	 * @param leftNeighbor - Left neighboring control point
	 * @param rightNeighbor - Right neighboring control point
	 * @param externalForce - External radial force (from collisions, gravity, etc.)
	 * @param dt - Delta time in seconds
	 */
	updateControlPoint(
		point: ControlPoint,
		velocity: ControlPointVelocity,
		leftNeighbor: ControlPoint,
		rightNeighbor: ControlPoint,
		externalForce: number,
		dt: number
	): void {
		// 1. Spring force to base radius (Hooke's law: F = -kx)
		const displacement = point.radius - point.baseRadius;
		const F_spring = -this.config.springConstant * displacement;

		// 2. Surface tension (pull toward average of neighbors)
		const avgNeighborRadius = (leftNeighbor.radius + rightNeighbor.radius) / 2;
		const tensionDisplacement = point.radius - avgNeighborRadius;
		const F_tension = -this.config.surfaceTension * tensionDisplacement;

		// 3. Pressure force (uniform outward/inward force)
		const pressureDeviation = this.config.pressure - 1.0;
		const F_pressure = pressureDeviation * point.baseRadius * 0.01;

		// 4. Neighbor coupling (spring forces to neighbors)
		const leftDisplacement = leftNeighbor.radius - point.radius;
		const rightDisplacement = rightNeighbor.radius - point.radius;
		const F_coupling = this.config.couplingStrength * (leftDisplacement + rightDisplacement) * 0.5;

		// 5. Damping (viscosity: F = -cv)
		const F_damping = -this.config.dampingCoeff * velocity.radialVelocity;

		// 6. External forces
		const F_external = externalForce;

		// Total force
		const F_total = F_spring + F_tension + F_pressure + F_coupling + F_damping + F_external;

		// Update velocity (F = ma, assume m = 1)
		velocity.radialVelocity += F_total * dt;

		// Clamp velocity to prevent explosion
		velocity.radialVelocity = Math.max(
			-this.config.maxVelocity,
			Math.min(this.config.maxVelocity, velocity.radialVelocity)
		);

		// Update position
		point.radius += velocity.radialVelocity * dt;

		// Clamp radius to prevent extreme deformation
		const minRadius = point.baseRadius * (1 - this.config.maxDeformation);
		const maxRadius = point.baseRadius * (1 + this.config.maxDeformation);
		point.radius = Math.max(minRadius, Math.min(maxRadius, point.radius));

		// If clamped, zero out velocity in that direction
		if (point.radius === minRadius || point.radius === maxRadius) {
			velocity.radialVelocity *= 0.3; // Bounce damping
		}
	}

	/**
	 * Update all control points for a blob
	 *
	 * @param points - Array of control points
	 * @param velocities - Array of velocity states
	 * @param externalForces - Per-point external forces (or single force for all)
	 * @param dt - Delta time in seconds
	 */
	updateAllControlPoints(
		points: ControlPoint[],
		velocities: ControlPointVelocity[],
		externalForces: number | number[],
		dt: number
	): void {
		const n = points.length;
		if (n < 3) return;

		// Pre-compute neighbor indices (circular)
		for (let i = 0; i < n; i++) {
			const leftIdx = (i - 1 + n) % n;
			const rightIdx = (i + 1) % n;

			const externalForce = Array.isArray(externalForces)
				? externalForces[i] || 0
				: externalForces;

			this.updateControlPoint(
				points[i],
				velocities[i],
				points[leftIdx],
				points[rightIdx],
				externalForce,
				dt
			);
		}
	}

	/**
	 * Apply an impulse to control points (for collisions, bounces)
	 *
	 * @param points - Control points array
	 * @param velocities - Velocities array
	 * @param impulseDirection - Angle of impulse (radians)
	 * @param impulseMagnitude - Strength of impulse
	 */
	applyImpulse(
		points: ControlPoint[],
		velocities: ControlPointVelocity[],
		impulseDirection: number,
		impulseMagnitude: number
	): void {
		for (let i = 0; i < points.length; i++) {
			const point = points[i];
			const velocity = velocities[i];

			// Calculate how aligned this point is with the impulse direction
			const alignment = Math.cos(point.angle - impulseDirection);

			// Points in the direction of impulse get compressed
			// Points opposite get expanded
			velocity.radialVelocity -= alignment * impulseMagnitude;
		}
	}

	/**
	 * Apply pressure change to all points (for blob-blob interaction)
	 *
	 * @param velocities - Velocities array
	 * @param pressureChange - Amount to change pressure (-1 to 1)
	 */
	applyPressure(velocities: ControlPointVelocity[], pressureChange: number): void {
		for (const velocity of velocities) {
			velocity.radialVelocity += pressureChange * 0.1;
		}
	}

	/**
	 * Get total kinetic energy of control points (for debugging)
	 */
	getKineticEnergy(velocities: ControlPointVelocity[]): number {
		let energy = 0;
		for (const v of velocities) {
			energy += 0.5 * v.radialVelocity * v.radialVelocity;
		}
		return energy;
	}

	/**
	 * Get total potential energy (spring displacement)
	 */
	getPotentialEnergy(points: ControlPoint[]): number {
		let energy = 0;
		for (const p of points) {
			const displacement = p.radius - p.baseRadius;
			energy += 0.5 * this.config.springConstant * displacement * displacement;
		}
		return energy;
	}

	/**
	 * Check if system is at rest (low energy)
	 */
	isAtRest(points: ControlPoint[], velocities: ControlPointVelocity[], threshold: number = 0.001): boolean {
		const ke = this.getKineticEnergy(velocities);
		const pe = this.getPotentialEnergy(points);
		return ke + pe < threshold;
	}

	/**
	 * Update configuration
	 */
	setConfig(config: Partial<SpringConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Get current configuration
	 */
	getConfig(): SpringConfig {
		return { ...this.config };
	}
}

/**
 * Create control point velocities for a new blob
 */
export function createControlPointVelocities(count: number): ControlPointVelocity[] {
	const velocities: ControlPointVelocity[] = [];
	for (let i = 0; i < count; i++) {
		velocities.push({
			radialVelocity: 0,
			angularVelocity: (Math.random() - 0.5) * 0.0004,
			pressureVelocity: 0,
		});
	}
	return velocities;
}

/**
 * Compute polygon area from control points (for area conservation)
 * Uses Shoelace formula
 */
export function computePolygonArea(points: ControlPoint[]): number {
	if (points.length < 3) return 0;

	let area = 0;
	const n = points.length;

	for (let i = 0; i < n; i++) {
		const p1 = points[i];
		const p2 = points[(i + 1) % n];

		// Convert polar to cartesian (relative to center)
		const x1 = Math.cos(p1.angle) * p1.radius;
		const y1 = Math.sin(p1.angle) * p1.radius;
		const x2 = Math.cos(p2.angle) * p2.radius;
		const y2 = Math.sin(p2.angle) * p2.radius;

		area += x1 * y2 - x2 * y1;
	}

	return Math.abs(area) / 2;
}

/**
 * Enforce area conservation by scaling all radii
 */
export function enforceAreaConservation(
	points: ControlPoint[],
	targetArea: number,
	tolerance: number = 0.05
): void {
	const currentArea = computePolygonArea(points);
	const areaRatio = currentArea / targetArea;

	if (Math.abs(areaRatio - 1) > tolerance) {
		const scaleFactor = Math.sqrt(1 / areaRatio);

		for (const point of points) {
			point.radius *= scaleFactor;
		}
	}
}

/**
 * Compute circularity metric (1.0 = perfect circle, lower = more irregular)
 */
export function computeCircularity(points: ControlPoint[]): number {
	if (points.length === 0) return 1.0;

	// Compute mean radius
	let sumRadius = 0;
	for (const p of points) {
		sumRadius += p.radius;
	}
	const meanRadius = sumRadius / points.length;

	// Compute variance
	let variance = 0;
	for (const p of points) {
		const diff = p.radius - meanRadius;
		variance += diff * diff;
	}
	variance /= points.length;

	// Circularity = 1 / (1 + coefficient of variation)
	const stdDev = Math.sqrt(variance);
	const cv = stdDev / meanRadius;

	return 1 / (1 + cv * 5); // Scale factor for sensitivity
}

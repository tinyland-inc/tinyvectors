











import type { ControlPoint, ControlPointVelocity } from './types.js';




export interface GelControlPoint extends ControlPoint {
	
	springConstant: number; 
	dampingCoeff: number; 
	couplingStrength: number; 
	mass: number; 

	
	radialVelocity: number;
	angularVelocity: number;
}




export interface SpringConfig {
	
	springConstant: number;
	
	dampingCoeff: number;
	
	couplingStrength: number;
	
	surfaceTension: number;
	
	pressure: number;
	
	maxDeformation: number;
	
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




export class SpringSystem {
	private config: SpringConfig;

	constructor(config: Partial<SpringConfig> = {}) {
		this.config = { ...DEFAULT_SPRING_CONFIG, ...config };
	}

	









	updateControlPoint(
		point: ControlPoint,
		velocity: ControlPointVelocity,
		leftNeighbor: ControlPoint,
		rightNeighbor: ControlPoint,
		externalForce: number,
		dt: number
	): void {
		
		const displacement = point.radius - point.baseRadius;
		const F_spring = -this.config.springConstant * displacement;

		
		const avgNeighborRadius = (leftNeighbor.radius + rightNeighbor.radius) / 2;
		const tensionDisplacement = point.radius - avgNeighborRadius;
		const F_tension = -this.config.surfaceTension * tensionDisplacement;

		
		const pressureDeviation = this.config.pressure - 1.0;
		const F_pressure = pressureDeviation * point.baseRadius * 0.01;

		
		const leftDisplacement = leftNeighbor.radius - point.radius;
		const rightDisplacement = rightNeighbor.radius - point.radius;
		const F_coupling = this.config.couplingStrength * (leftDisplacement + rightDisplacement) * 0.5;

		
		const F_damping = -this.config.dampingCoeff * velocity.radialVelocity;

		
		const F_external = externalForce;

		
		const F_total = F_spring + F_tension + F_pressure + F_coupling + F_damping + F_external;

		
		velocity.radialVelocity += F_total * dt;

		
		velocity.radialVelocity = Math.max(
			-this.config.maxVelocity,
			Math.min(this.config.maxVelocity, velocity.radialVelocity)
		);

		
		point.radius += velocity.radialVelocity * dt;

		
		const minRadius = point.baseRadius * (1 - this.config.maxDeformation);
		const maxRadius = point.baseRadius * (1 + this.config.maxDeformation);
		point.radius = Math.max(minRadius, Math.min(maxRadius, point.radius));

		
		if (point.radius === minRadius || point.radius === maxRadius) {
			velocity.radialVelocity *= 0.3; 
		}
	}

	







	updateAllControlPoints(
		points: ControlPoint[],
		velocities: ControlPointVelocity[],
		externalForces: number | number[],
		dt: number
	): void {
		const n = points.length;
		if (n < 3) return;

		
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

	







	applyImpulse(
		points: ControlPoint[],
		velocities: ControlPointVelocity[],
		impulseDirection: number,
		impulseMagnitude: number
	): void {
		for (let i = 0; i < points.length; i++) {
			const point = points[i];
			const velocity = velocities[i];

			
			const alignment = Math.cos(point.angle - impulseDirection);

			
			
			velocity.radialVelocity -= alignment * impulseMagnitude;
		}
	}

	





	applyPressure(velocities: ControlPointVelocity[], pressureChange: number): void {
		for (const velocity of velocities) {
			velocity.radialVelocity += pressureChange * 0.1;
		}
	}

	


	getKineticEnergy(velocities: ControlPointVelocity[]): number {
		let energy = 0;
		for (const v of velocities) {
			energy += 0.5 * v.radialVelocity * v.radialVelocity;
		}
		return energy;
	}

	


	getPotentialEnergy(points: ControlPoint[]): number {
		let energy = 0;
		for (const p of points) {
			const displacement = p.radius - p.baseRadius;
			energy += 0.5 * this.config.springConstant * displacement * displacement;
		}
		return energy;
	}

	


	isAtRest(points: ControlPoint[], velocities: ControlPointVelocity[], threshold: number = 0.001): boolean {
		const ke = this.getKineticEnergy(velocities);
		const pe = this.getPotentialEnergy(points);
		return ke + pe < threshold;
	}

	


	setConfig(config: Partial<SpringConfig>): void {
		this.config = { ...this.config, ...config };
	}

	


	getConfig(): SpringConfig {
		return { ...this.config };
	}
}




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





export function computePolygonArea(points: ControlPoint[]): number {
	if (points.length < 3) return 0;

	let area = 0;
	const n = points.length;

	for (let i = 0; i < n; i++) {
		const p1 = points[i];
		const p2 = points[(i + 1) % n];

		
		const x1 = Math.cos(p1.angle) * p1.radius;
		const y1 = Math.sin(p1.angle) * p1.radius;
		const x2 = Math.cos(p2.angle) * p2.radius;
		const y2 = Math.sin(p2.angle) * p2.radius;

		area += x1 * y2 - x2 * y1;
	}

	return Math.abs(area) / 2;
}




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




export function computeCircularity(points: ControlPoint[]): number {
	if (points.length === 0) return 1.0;

	
	let sumRadius = 0;
	for (const p of points) {
		sumRadius += p.radius;
	}
	const meanRadius = sumRadius / points.length;

	
	let variance = 0;
	for (const p of points) {
		const diff = p.radius - meanRadius;
		variance += diff * diff;
	}
	variance /= points.length;

	
	const stdDev = Math.sqrt(variance);
	const cv = stdDev / meanRadius;

	return 1 / (1 + cv * 5); 
}









export interface ControlPoint {
	radius: number;
	angle: number;
	targetRadius: number;
	baseRadius: number;
	pressure?: number;
	adhesion?: number;
	tension?: number;
}




export interface ControlPointVelocity {
	radialVelocity: number;
	angularVelocity: number;
	pressureVelocity?: number;
}




export interface ConvexBlob {
	
	baseX: number;
	baseY: number;
	currentX: number;
	currentY: number;
	velocityX: number;
	velocityY: number;
	size: number;

	
	elasticity: number;
	viscosity: number;
	phase: number;
	speed: number;

	
	color: string;
	gradientId: string;
	intensity: number;
	stickiness: number;
	isAttractive: boolean;
	mouseDistance: number;
	isStuck: boolean;
	radiusVariations: number[];
	fluidMass: number;
	scrollAffinity: number;

	
	surfaceTension?: number;
	density?: number;
	flowResistance?: number;

	
	controlPoints?: ControlPoint[];
	controlVelocities?: ControlPointVelocity[];
	deformationStrength?: number;
	cohesion?: number;
	stretchability?: number;
	lastCollisionTime?: number;
	mergeThreshold?: number;
	splitThreshold?: number;

	
	isSettled?: boolean;
	settleTime?: number;
	groundContactPoints?: number[];
	restHeight?: number;

	
	wetting?: number;
	contactAngle?: number;
	pressureDistribution?: number[];
	chaosLevel?: number;
	turbulenceDecay?: number;

	
	dampingFactor?: number;
	stabilityThreshold?: number;
	lastStableTime?: number;

	
	expansionPhase?: boolean;
	expansionTime?: number;
	maxExpansionTime?: number;
	wallBounceCount?: number;
	lastBounceTime?: number;
	driftAngle?: number;
	driftSpeed?: number;

	
	territoryRadius?: number;
	territoryX?: number;
	territoryY?: number;

	
	personalSpace?: number;
	repulsionStrength?: number;
	lastRepulsionTime?: number;
}




export interface ColorDefinition {
	color: string;
	attractive: boolean;
	scrollAffinity: number;
}




export interface DeviceMotionData {
	alpha: number | null;
	beta: number | null;
	gamma: number | null;
	x?: number;
	y?: number;
	z?: number;
}




export interface GravityVector {
	x: number;
	y: number;
}




export interface TiltVector {
	x: number;
	y: number;
	z: number;
}




export interface PullForce {
	strength: number;
	time: number;
	randomness: number;
	explosive: boolean;
}

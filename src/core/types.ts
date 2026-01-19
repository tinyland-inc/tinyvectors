/**
 * TinyVectors Core Types
 * Type definitions for the blob physics simulation
 */

/**
 * Control point for organic blob shape deformation
 */
export interface ControlPoint {
	radius: number;
	angle: number;
	targetRadius: number;
	baseRadius: number;
	pressure?: number;
	adhesion?: number;
	tension?: number;
}

/**
 * Velocity data for control point animation
 */
export interface ControlPointVelocity {
	radialVelocity: number;
	angularVelocity: number;
	pressureVelocity?: number;
}

/**
 * Full ConvexBlob type with all physics and rendering properties
 */
export interface ConvexBlob {
	// Core position
	baseX: number;
	baseY: number;
	currentX: number;
	currentY: number;
	velocityX: number;
	velocityY: number;
	size: number;

	// Physics properties
	elasticity: number;
	viscosity: number;
	phase: number;
	speed: number;

	// Rendering properties
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

	// Surface properties
	surfaceTension?: number;
	density?: number;
	flowResistance?: number;

	// Dynamic shape properties - organic deformation
	controlPoints?: ControlPoint[];
	controlVelocities?: ControlPointVelocity[];
	deformationStrength?: number;
	cohesion?: number;
	stretchability?: number;
	lastCollisionTime?: number;
	mergeThreshold?: number;
	splitThreshold?: number;

	// Settling and fluid behavior
	isSettled?: boolean;
	settleTime?: number;
	groundContactPoints?: number[];
	restHeight?: number;

	// Water-on-glass properties
	wetting?: number;
	contactAngle?: number;
	pressureDistribution?: number[];
	chaosLevel?: number;
	turbulenceDecay?: number;

	// Stability properties
	dampingFactor?: number;
	stabilityThreshold?: number;
	lastStableTime?: number;

	// Screensaver-style physics
	expansionPhase?: boolean;
	expansionTime?: number;
	maxExpansionTime?: number;
	wallBounceCount?: number;
	lastBounceTime?: number;
	driftAngle?: number;
	driftSpeed?: number;

	// Territory/dispersion properties
	territoryRadius?: number;
	territoryX?: number;
	territoryY?: number;

	// Anti-clustering properties
	personalSpace?: number;
	repulsionStrength?: number;
	lastRepulsionTime?: number;
}

/**
 * Color definition for theme colors
 */
export interface ColorDefinition {
	color: string;
	attractive: boolean;
	scrollAffinity: number;
}

/**
 * Device motion sensor data
 */
export interface DeviceMotionData {
	alpha: number | null;
	beta: number | null;
	gamma: number | null;
	x?: number;
	y?: number;
	z?: number;
}

/**
 * Gravity vector from accelerometer
 */
export interface GravityVector {
	x: number;
	y: number;
}

/**
 * Tilt vector from device orientation
 */
export interface TiltVector {
	x: number;
	y: number;
	z: number;
}

/**
 * Pull force for scroll/interaction effects
 */
export interface PullForce {
	strength: number;
	time: number;
	randomness: number;
	explosive: boolean;
}

/**
 * Property-Based Testing Arbitraries for TinyVectors
 *
 * Custom fast-check arbitraries for generating test data.
 * Uses Math.fround() for 32-bit float compatibility.
 */

import * as fc from 'fast-check';
import type { ControlPoint, ControlPointVelocity, ConvexBlob } from '../../src/core/types.js';

// ============================================================================
// Control Point Arbitraries
// ============================================================================

/**
 * Generate a valid control point
 */
export const controlPointArb: fc.Arbitrary<ControlPoint> = fc.record({
	radius: fc.float({ min: Math.fround(5), max: Math.fround(50), noNaN: true }),
	angle: fc.float({ min: 0, max: Math.fround(Math.PI * 2), noNaN: true }),
	baseRadius: fc.float({ min: Math.fround(5), max: Math.fround(50), noNaN: true }),
	targetRadius: fc.float({ min: Math.fround(5), max: Math.fround(50), noNaN: true }),
	pressure: fc.float({ min: Math.fround(0.5), max: Math.fround(2.0), noNaN: true }),
	adhesion: fc.float({ min: 0, max: Math.fround(0.3), noNaN: true }),
	tension: fc.float({ min: Math.fround(0.1), max: Math.fround(0.5), noNaN: true }),
});

/**
 * Generate control point with consistent baseRadius and radius
 */
export const consistentControlPointArb: fc.Arbitrary<ControlPoint> = fc
	.float({ min: Math.fround(10), max: Math.fround(40), noNaN: true })
	.chain((baseRadius) =>
		fc.record({
			radius: fc.float({
				min: Math.fround(baseRadius * 0.7),
				max: Math.fround(baseRadius * 1.3),
				noNaN: true,
			}),
			angle: fc.float({ min: 0, max: Math.fround(Math.PI * 2), noNaN: true }),
			baseRadius: fc.constant(baseRadius),
			targetRadius: fc.float({
				min: Math.fround(baseRadius * 0.85),
				max: Math.fround(baseRadius * 1.15),
				noNaN: true,
			}),
			pressure: fc.float({ min: Math.fround(0.8), max: Math.fround(1.2), noNaN: true }),
			adhesion: fc.float({ min: Math.fround(0.1), max: Math.fround(0.25), noNaN: true }),
			tension: fc.float({ min: Math.fround(0.2), max: Math.fround(0.45), noNaN: true }),
		})
	);

/**
 * Generate control point velocity
 */
export const controlPointVelocityArb: fc.Arbitrary<ControlPointVelocity> = fc.record({
	radialVelocity: fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
	angularVelocity: fc.float({ min: Math.fround(-0.01), max: Math.fround(0.01), noNaN: true }),
	pressureVelocity: fc.float({ min: Math.fround(-0.1), max: Math.fround(0.1), noNaN: true }),
});

/**
 * Generate array of control points forming a valid blob shape
 * Points are evenly distributed around a circle
 */
export const controlPointsArrayArb = (count: number = 8): fc.Arbitrary<ControlPoint[]> =>
	fc
		.float({ min: Math.fround(15), max: Math.fround(35), noNaN: true })
		.chain((baseSize) =>
			fc.array(
				fc.record({
					radius: fc.float({
						min: Math.fround(baseSize * 0.8),
						max: Math.fround(baseSize * 1.2),
						noNaN: true,
					}),
					baseRadius: fc.constant(baseSize),
					targetRadius: fc.constant(baseSize),
					pressure: fc.float({ min: Math.fround(0.9), max: Math.fround(1.1), noNaN: true }),
					adhesion: fc.float({ min: Math.fround(0.1), max: Math.fround(0.2), noNaN: true }),
					tension: fc.float({ min: Math.fround(0.2), max: Math.fround(0.4), noNaN: true }),
				}),
				{ minLength: count, maxLength: count }
			)
		)
		.map((points) =>
			points.map((p, i) => ({
				...p,
				angle: (i / points.length) * Math.PI * 2,
			}))
		);

// ============================================================================
// Blob Arbitraries
// ============================================================================

/**
 * Physics bounds
 */
const PHYSICS_MIN = -40;
const PHYSICS_MAX = 140;

/**
 * Generate position within physics bounds
 */
export const positionArb = fc.record({
	x: fc.float({ min: Math.fround(PHYSICS_MIN + 20), max: Math.fround(PHYSICS_MAX - 20), noNaN: true }),
	y: fc.float({ min: Math.fround(PHYSICS_MIN + 20), max: Math.fround(PHYSICS_MAX - 20), noNaN: true }),
});

/**
 * Generate velocity vector
 */
export const velocityArb = fc.record({
	x: fc.float({ min: Math.fround(-0.5), max: Math.fround(0.5), noNaN: true }),
	y: fc.float({ min: Math.fround(-0.5), max: Math.fround(0.5), noNaN: true }),
});

/**
 * Generate a minimal blob for physics testing
 */
export const minimalBlobArb: fc.Arbitrary<Partial<ConvexBlob>> = fc.record({
	currentX: fc.float({ min: Math.fround(PHYSICS_MIN + 20), max: Math.fround(PHYSICS_MAX - 20), noNaN: true }),
	currentY: fc.float({ min: Math.fround(PHYSICS_MIN + 20), max: Math.fround(PHYSICS_MAX - 20), noNaN: true }),
	velocityX: fc.float({ min: Math.fround(-0.5), max: Math.fround(0.5), noNaN: true }),
	velocityY: fc.float({ min: Math.fround(-0.5), max: Math.fround(0.5), noNaN: true }),
	size: fc.float({ min: Math.fround(15), max: Math.fround(35), noNaN: true }),
	personalSpace: fc.float({ min: Math.fround(30), max: Math.fround(60), noNaN: true }),
});

/**
 * Generate a full blob with control points
 */
export const fullBlobArb: fc.Arbitrary<ConvexBlob> = fc
	.tuple(
		fc.float({ min: Math.fround(PHYSICS_MIN + 20), max: Math.fround(PHYSICS_MAX - 20), noNaN: true }),
		fc.float({ min: Math.fround(PHYSICS_MIN + 20), max: Math.fround(PHYSICS_MAX - 20), noNaN: true }),
		fc.float({ min: Math.fround(15), max: Math.fround(35), noNaN: true }),
		fc.integer({ min: 0, max: 1000000 })
	)
	.chain(([x, y, size, seed]) =>
		controlPointsArrayArb(8).map((controlPoints) => ({
			baseX: x,
			baseY: y,
			currentX: x,
			currentY: y,
			velocityX: 0,
			velocityY: 0,
			size,
			elasticity: 0.0005,
			viscosity: 0.996,
			phase: (seed % 1000) / 1000 * Math.PI * 2,
			speed: 0.004,
			color: `hsl(${seed % 360}, 70%, 60%)`,
			gradientId: `blob-${seed}`,
			intensity: 0.75,
			stickiness: 2,
			isAttractive: seed % 2 === 0,
			mouseDistance: 100,
			isStuck: false,
			radiusVariations: [],
			fluidMass: 0.6,
			scrollAffinity: 0.5,
			controlPoints,
			controlVelocities: controlPoints.map(() => ({
				radialVelocity: 0,
				angularVelocity: 0,
				pressureVelocity: 0,
			})),
			personalSpace: 45,
			repulsionStrength: 0.03,
		}))
	);

/**
 * Generate array of blobs
 */
export const blobsArrayArb = (count: number = 8): fc.Arbitrary<ConvexBlob[]> =>
	fc.array(fullBlobArb, { minLength: count, maxLength: count });

// ============================================================================
// Force and Physics Arbitraries
// ============================================================================

/**
 * Generate gravity/accelerometer vector
 */
export const gravityArb = fc.record({
	x: fc.float({ min: Math.fround(-9.8), max: Math.fround(9.8), noNaN: true }),
	y: fc.float({ min: Math.fround(-9.8), max: Math.fround(9.8), noNaN: true }),
});

/**
 * Generate normalized gravity (-1 to 1)
 */
export const normalizedGravityArb = fc.record({
	x: fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
	y: fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
});

/**
 * Generate tilt vector
 */
export const tiltArb = fc.record({
	x: fc.float({ min: Math.fround(-2), max: Math.fround(2), noNaN: true }),
	y: fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
	z: fc.float({ min: 0, max: Math.fround(1), noNaN: true }),
});

/**
 * Generate delta time (frame time)
 */
export const deltaTimeArb = fc.float({ min: Math.fround(0.001), max: Math.fround(0.05), noNaN: true });

/**
 * Generate external force
 */
export const forceArb = fc.record({
	x: fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
	y: fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
});

/**
 * Generate radial force (for control point deformation)
 */
export const radialForceArb = fc.float({ min: Math.fround(-0.5), max: Math.fround(0.5), noNaN: true });

// ============================================================================
// Kernel and Smoothing Arbitraries
// ============================================================================

/**
 * Generate odd kernel size (3, 5, 7, 9)
 */
export const kernelSizeArb = fc.integer({ min: 1, max: 4 }).map((n) => n * 2 + 1);

/**
 * Generate Gaussian sigma
 */
export const sigmaArb = fc.float({ min: Math.fround(0.5), max: Math.fround(3.0), noNaN: true });

// ============================================================================
// Spatial Hash Arbitraries
// ============================================================================

/**
 * Generate cell size for spatial hash
 */
export const cellSizeArb = fc.float({ min: Math.fround(20), max: Math.fround(80), noNaN: true });

/**
 * Generate query radius
 */
export const queryRadiusArb = fc.float({ min: Math.fround(10), max: Math.fround(100), noNaN: true });

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a blob at a specific position (for controlled tests)
 */
export function createBlobAt(x: number, y: number, size: number = 25): ConvexBlob {
	const controlPoints: ControlPoint[] = [];
	const controlVelocities: ControlPointVelocity[] = [];

	for (let i = 0; i < 8; i++) {
		controlPoints.push({
			radius: size,
			angle: (i / 8) * Math.PI * 2,
			baseRadius: size,
			targetRadius: size,
			pressure: 1.0,
			adhesion: 0.15,
			tension: 0.3,
		});
		controlVelocities.push({
			radialVelocity: 0,
			angularVelocity: 0,
			pressureVelocity: 0,
		});
	}

	return {
		baseX: x,
		baseY: y,
		currentX: x,
		currentY: y,
		velocityX: 0,
		velocityY: 0,
		size,
		elasticity: 0.0005,
		viscosity: 0.996,
		phase: 0,
		speed: 0.004,
		color: 'hsl(200, 70%, 60%)',
		gradientId: `blob-${Date.now()}`,
		intensity: 0.75,
		stickiness: 2,
		isAttractive: true,
		mouseDistance: 100,
		isStuck: false,
		radiusVariations: [],
		fluidMass: 0.6,
		scrollAffinity: 0.5,
		controlPoints,
		controlVelocities,
		personalSpace: 45,
		repulsionStrength: 0.03,
	};
}

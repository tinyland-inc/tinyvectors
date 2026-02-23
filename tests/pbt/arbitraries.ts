






import * as fc from 'fast-check';
import type { ControlPoint, ControlPointVelocity, ConvexBlob } from '../../src/core/types.js';








export const controlPointArb: fc.Arbitrary<ControlPoint> = fc.record({
	radius: fc.float({ min: Math.fround(5), max: Math.fround(50), noNaN: true }),
	angle: fc.float({ min: 0, max: Math.fround(Math.PI * 2), noNaN: true }),
	baseRadius: fc.float({ min: Math.fround(5), max: Math.fround(50), noNaN: true }),
	targetRadius: fc.float({ min: Math.fround(5), max: Math.fround(50), noNaN: true }),
	pressure: fc.float({ min: Math.fround(0.5), max: Math.fround(2.0), noNaN: true }),
	adhesion: fc.float({ min: 0, max: Math.fround(0.3), noNaN: true }),
	tension: fc.float({ min: Math.fround(0.1), max: Math.fround(0.5), noNaN: true }),
});




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




export const controlPointVelocityArb: fc.Arbitrary<ControlPointVelocity> = fc.record({
	radialVelocity: fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
	angularVelocity: fc.float({ min: Math.fround(-0.01), max: Math.fround(0.01), noNaN: true }),
	pressureVelocity: fc.float({ min: Math.fround(-0.1), max: Math.fround(0.1), noNaN: true }),
});





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








const PHYSICS_MIN = -40;
const PHYSICS_MAX = 140;




export const positionArb = fc.record({
	x: fc.float({ min: Math.fround(PHYSICS_MIN + 20), max: Math.fround(PHYSICS_MAX - 20), noNaN: true }),
	y: fc.float({ min: Math.fround(PHYSICS_MIN + 20), max: Math.fround(PHYSICS_MAX - 20), noNaN: true }),
});




export const velocityArb = fc.record({
	x: fc.float({ min: Math.fround(-0.5), max: Math.fround(0.5), noNaN: true }),
	y: fc.float({ min: Math.fround(-0.5), max: Math.fround(0.5), noNaN: true }),
});




export const minimalBlobArb: fc.Arbitrary<Partial<ConvexBlob>> = fc.record({
	currentX: fc.float({ min: Math.fround(PHYSICS_MIN + 20), max: Math.fround(PHYSICS_MAX - 20), noNaN: true }),
	currentY: fc.float({ min: Math.fround(PHYSICS_MIN + 20), max: Math.fround(PHYSICS_MAX - 20), noNaN: true }),
	velocityX: fc.float({ min: Math.fround(-0.5), max: Math.fround(0.5), noNaN: true }),
	velocityY: fc.float({ min: Math.fround(-0.5), max: Math.fround(0.5), noNaN: true }),
	size: fc.float({ min: Math.fround(15), max: Math.fround(35), noNaN: true }),
	personalSpace: fc.float({ min: Math.fround(30), max: Math.fround(60), noNaN: true }),
});




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




export const blobsArrayArb = (count: number = 8): fc.Arbitrary<ConvexBlob[]> =>
	fc.array(fullBlobArb, { minLength: count, maxLength: count });








export const gravityArb = fc.record({
	x: fc.float({ min: Math.fround(-9.8), max: Math.fround(9.8), noNaN: true }),
	y: fc.float({ min: Math.fround(-9.8), max: Math.fround(9.8), noNaN: true }),
});




export const normalizedGravityArb = fc.record({
	x: fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
	y: fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
});




export const tiltArb = fc.record({
	x: fc.float({ min: Math.fround(-2), max: Math.fround(2), noNaN: true }),
	y: fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
	z: fc.float({ min: 0, max: Math.fround(1), noNaN: true }),
});




export const deltaTimeArb = fc.float({ min: Math.fround(0.001), max: Math.fround(0.05), noNaN: true });




export const forceArb = fc.record({
	x: fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
	y: fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
});




export const radialForceArb = fc.float({ min: Math.fround(-0.5), max: Math.fround(0.5), noNaN: true });








export const kernelSizeArb = fc.integer({ min: 1, max: 4 }).map((n) => n * 2 + 1);




export const sigmaArb = fc.float({ min: Math.fround(0.5), max: Math.fround(3.0), noNaN: true });








export const cellSizeArb = fc.float({ min: Math.fround(20), max: Math.fround(80), noNaN: true });




export const queryRadiusArb = fc.float({ min: Math.fround(10), max: Math.fround(100), noNaN: true });








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

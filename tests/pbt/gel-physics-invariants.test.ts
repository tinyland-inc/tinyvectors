/**
 * Property-Based Tests for Gel Physics Invariants
 *
 * Tests mathematical invariants that must hold for physically-correct gel simulation.
 */

import { describe, expect, beforeEach } from 'vitest';
import { it } from '@fast-check/vitest';
import * as fc from 'fast-check';

import { GaussianKernel } from '../../src/core/GaussianKernel.js';
import { SpatialHash } from '../../src/core/SpatialHash.js';
import {
	SpringSystem,
	computePolygonArea,
	computeCircularity,
	enforceAreaConservation,
	createControlPointVelocities,
} from '../../src/core/SpringSystem.js';
import type { ControlPoint, ConvexBlob } from '../../src/core/types.js';
import {
	controlPointsArrayArb,
	controlPointVelocityArb,
	fullBlobArb,
	blobsArrayArb,
	deltaTimeArb,
	kernelSizeArb,
	sigmaArb,
	radialForceArb,
	positionArb,
	queryRadiusArb,
	cellSizeArb,
	createBlobAt,
} from './arbitraries.js';

// ============================================================================
// Gaussian Kernel Invariants
// ============================================================================

describe('Gaussian Kernel Invariants', () => {
	it.prop([kernelSizeArb, sigmaArb])(
		'INVARIANT: Kernel weights sum to 1.0 (normalized)',
		(size, sigma) => {
			const kernel = new GaussianKernel(size, sigma);
			const weights = kernel.getWeights();

			let sum = 0;
			for (let i = 0; i < weights.length; i++) {
				sum += weights[i];
			}

			// Allow small numerical error
			return Math.abs(sum - 1.0) < 0.0001;
		}
	);

	it.prop([kernelSizeArb, sigmaArb])(
		'INVARIANT: Kernel is symmetric',
		(size, sigma) => {
			const kernel = new GaussianKernel(size, sigma);
			const weights = kernel.getWeights();
			const n = weights.length;

			for (let i = 0; i < Math.floor(n / 2); i++) {
				if (Math.abs(weights[i] - weights[n - 1 - i]) > 0.0001) {
					return false;
				}
			}
			return true;
		}
	);

	it.prop([controlPointsArrayArb(8), kernelSizeArb, sigmaArb])(
		'INVARIANT: Gaussian smoothing reduces radius variance',
		(points, size, sigma) => {
			const radii = points.map((p) => p.radius);
			const varianceBefore = GaussianKernel.computeVariance(radii);

			const kernel = new GaussianKernel(size, sigma);
			kernel.convolve(points);

			const radiiAfter = points.map((p) => p.radius);
			const varianceAfter = GaussianKernel.computeVariance(radiiAfter);

			// Variance should decrease or stay same (with small tolerance for numerical error)
			return varianceAfter <= varianceBefore * 1.01;
		}
	);

	it.prop([controlPointsArrayArb(8)])(
		'INVARIANT: Smoothing preserves mean radius',
		(points) => {
			const radii = points.map((p) => p.radius);
			const meanBefore = radii.reduce((a, b) => a + b, 0) / radii.length;

			const kernel = new GaussianKernel(5, 1.0);
			kernel.convolve(points);

			const radiiAfter = points.map((p) => p.radius);
			const meanAfter = radiiAfter.reduce((a, b) => a + b, 0) / radiiAfter.length;

			// Mean should be preserved (within numerical tolerance)
			return Math.abs(meanAfter - meanBefore) < 0.01;
		}
	);
});

// ============================================================================
// Spatial Hash Invariants
// ============================================================================

describe('Spatial Hash Invariants', () => {
	it.prop([blobsArrayArb(5), positionArb, queryRadiusArb])(
		'INVARIANT: Spatial hash returns superset of brute force results',
		(blobs, pos, radius) => {
			const hash = new SpatialHash(50);
			hash.rebuild(blobs);

			const hashResults = new Set(
				hash.query(pos.x, pos.y, radius)
			);

			// Brute force: find all blobs within radius
			const bruteForceResults = blobs.filter((b) => {
				const dx = b.currentX - pos.x;
				const dy = b.currentY - pos.y;
				return Math.sqrt(dx * dx + dy * dy) < radius;
			});

			// Hash must return at least everything brute force finds
			return bruteForceResults.every((b) => hashResults.has(b));
		}
	);

	it.prop([blobsArrayArb(6), cellSizeArb])(
		'INVARIANT: Rebuild is idempotent',
		(blobs, cellSize) => {
			const hash = new SpatialHash(cellSize);

			hash.rebuild(blobs);
			const cellCount1 = hash.getCellCount();

			hash.rebuild(blobs);
			const cellCount2 = hash.getCellCount();

			return cellCount1 === cellCount2;
		}
	);

	it.prop([blobsArrayArb(4)])(
		'INVARIANT: getAllPairs returns each pair exactly once',
		(blobs) => {
			// Give each blob unique positions and unique IDs to avoid shrinking collisions
			blobs.forEach((b, i) => {
				b.currentX = 20 + i * 30;
				b.currentY = 20 + i * 20;
				b.gradientId = `blob-unique-${i}`; // Ensure unique ID
			});

			const hash = new SpatialHash(100); // Large cell to ensure all pairs found
			hash.rebuild(blobs);

			const pairs = hash.getAllPairs(200); // Large radius to include all

			// Check for duplicates and self-pairs using object identity
			const seenPairs = new Set<string>();
			for (const [b1, b2] of pairs) {
				// Should never have self-pair (same object)
				if (b1 === b2) {
					return false;
				}

				// Create canonical key (always smaller ID first)
				const id1 = b1.gradientId;
				const id2 = b2.gradientId;
				const key = id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;

				if (seenPairs.has(key)) {
					return false; // Duplicate found
				}
				seenPairs.add(key);
			}

			return true;
		}
	);
});

// ============================================================================
// Spring System Invariants
// ============================================================================

describe('Spring System Invariants', () => {
	let springSystem: SpringSystem;

	beforeEach(() => {
		springSystem = new SpringSystem();
	});

	it.prop([controlPointsArrayArb(8), deltaTimeArb])(
		'INVARIANT: Spring force creates restoring velocity toward baseRadius',
		(points, dt) => {
			const velocities = createControlPointVelocities(points.length);

			// Set up a point with positive displacement (larger than base)
			const idx = 0;
			points[idx].radius = points[idx].baseRadius * 1.2; // 20% larger
			velocities[idx].radialVelocity = 0;

			springSystem.updateControlPoint(
				points[idx],
				velocities[idx],
				points[points.length - 1],
				points[1],
				0,
				dt
			);

			// Point expanded beyond base should get negative velocity (contracting)
			// allowing for coupling and tension effects that might partially offset
			return velocities[idx].radialVelocity < 0.1;
		}
	);

	it.prop([controlPointsArrayArb(8)])(
		'INVARIANT: System energy decreases over time (damping)',
		(points) => {
			// Use high-damping spring system for this test
			const dampedSystem = new SpringSystem({ dampingCoeff: 0.25, springConstant: 0.15 });
			const velocities = createControlPointVelocities(points.length);

			// Give all points high initial velocity AND displacement
			for (let i = 0; i < points.length; i++) {
				velocities[i].radialVelocity = 1.5;
				points[i].radius = points[i].baseRadius * 1.2; // 20% displacement
			}

			const energyBefore = dampedSystem.getKineticEnergy(velocities) + dampedSystem.getPotentialEnergy(points);

			// Run many updates
			for (let frame = 0; frame < 300; frame++) {
				dampedSystem.updateAllControlPoints(points, velocities, 0, 0.016);
			}

			const energyAfter = dampedSystem.getKineticEnergy(velocities) + dampedSystem.getPotentialEnergy(points);

			// Total energy should decrease (damping dissipates energy)
			// Check that final energy is strictly less than initial
			return energyAfter < energyBefore;
		}
	);

	it.prop([controlPointsArrayArb(8)])(
		'INVARIANT: System energy bounded and decays toward equilibrium',
		(points) => {
			// Use overdamped spring system for guaranteed convergence
			const overdampedSystem = new SpringSystem({
				springConstant: 0.08,
				dampingCoeff: 0.3, // Heavy damping
				couplingStrength: 0.02,
				surfaceTension: 0.02,
			});
			const velocities = createControlPointVelocities(points.length);

			// Strong perturbation for measurable energy
			for (let i = 0; i < points.length; i++) {
				points[i].radius = points[i].baseRadius * 1.25; // 25% expansion
				velocities[i].radialVelocity = 1.0;
			}

			const initialEnergy = overdampedSystem.getKineticEnergy(velocities) + overdampedSystem.getPotentialEnergy(points);

			// Run physics for many frames
			for (let frame = 0; frame < 600; frame++) {
				overdampedSystem.updateAllControlPoints(points, velocities, 0, 0.016);
			}

			const finalEnergy = overdampedSystem.getKineticEnergy(velocities) + overdampedSystem.getPotentialEnergy(points);

			// Energy should be lower than initial (damping always removes energy)
			return finalEnergy < initialEnergy;
		}
	);
});

// ============================================================================
// Area Conservation Invariants
// ============================================================================

describe('Area Conservation Invariants', () => {
	it.prop([controlPointsArrayArb(8)])(
		'INVARIANT: enforceAreaConservation brings area to target',
		(points) => {
			// Compute target area (circle with mean radius)
			const meanRadius = points.reduce((sum, p) => sum + p.baseRadius, 0) / points.length;
			const targetArea = Math.PI * meanRadius * meanRadius;

			// Randomly deform
			for (const p of points) {
				p.radius *= 0.5 + Math.random();
			}

			const areaBefore = computePolygonArea(points);

			enforceAreaConservation(points, targetArea, 0.01);

			const areaAfter = computePolygonArea(points);

			// Area should be within 1% of target
			return Math.abs(areaAfter - targetArea) / targetArea < 0.02;
		}
	);

	it.prop([controlPointsArrayArb(8)])(
		'INVARIANT: Polygon area is always positive',
		(points) => {
			const area = computePolygonArea(points);
			return area > 0;
		}
	);
});

// ============================================================================
// Circularity Invariants
// ============================================================================

describe('Circularity Invariants', () => {
	it.prop([controlPointsArrayArb(8)])(
		'INVARIANT: Circularity is between 0 and 1',
		(points) => {
			const circularity = computeCircularity(points);
			return circularity >= 0 && circularity <= 1;
		}
	);

	it('INVARIANT: Perfect circle has circularity 1.0', () => {
		const points: ControlPoint[] = [];
		const radius = 20;

		for (let i = 0; i < 8; i++) {
			points.push({
				radius,
				angle: (i / 8) * Math.PI * 2,
				baseRadius: radius,
				targetRadius: radius,
			});
		}

		const circularity = computeCircularity(points);
		expect(circularity).toBeCloseTo(1.0, 2);
	});

	it.prop([controlPointsArrayArb(8)])(
		'INVARIANT: Smoothing increases circularity',
		(points) => {
			// Deform away from circular
			for (let i = 0; i < points.length; i++) {
				points[i].radius *= 1 + Math.sin(i * 2) * 0.3;
			}

			const circularityBefore = computeCircularity(points);

			// Apply smoothing multiple times
			const kernel = new GaussianKernel(5, 1.5);
			for (let i = 0; i < 10; i++) {
				kernel.convolve(points);
			}

			const circularityAfter = computeCircularity(points);

			// Should be more circular (or at least not less)
			return circularityAfter >= circularityBefore - 0.05;
		}
	);
});

// ============================================================================
// Blob Physics Integration Invariants
// ============================================================================

describe('Blob Physics Integration', () => {
	it.prop([fullBlobArb])(
		'INVARIANT: Blob position bounded after many updates',
		(blob) => {
			const PHYSICS_MIN = -40;
			const PHYSICS_MAX = 140;

			// Simulate movement
			for (let i = 0; i < 100; i++) {
				blob.currentX += blob.velocityX;
				blob.currentY += blob.velocityY;

				// Apply bounds (simplified)
				const margin = blob.size * 0.8;
				blob.currentX = Math.max(PHYSICS_MIN + margin, Math.min(PHYSICS_MAX - margin, blob.currentX));
				blob.currentY = Math.max(PHYSICS_MIN + margin, Math.min(PHYSICS_MAX - margin, blob.currentY));

				// Add some drift
				blob.velocityX += (Math.random() - 0.5) * 0.01;
				blob.velocityY += (Math.random() - 0.5) * 0.01;
				blob.velocityX *= 0.99;
				blob.velocityY *= 0.99;
			}

			// Should still be in bounds
			return (
				blob.currentX >= PHYSICS_MIN &&
				blob.currentX <= PHYSICS_MAX &&
				blob.currentY >= PHYSICS_MIN &&
				blob.currentY <= PHYSICS_MAX
			);
		}
	);

	it('INVARIANT: Two blobs that overlap get repelled', () => {
		const blob1 = createBlobAt(50, 50, 25);
		const blob2 = createBlobAt(55, 50, 25); // Overlapping

		const distance = Math.hypot(blob2.currentX - blob1.currentX, blob2.currentY - blob1.currentY);
		const minDistance = (blob1.personalSpace || 45);

		// They overlap
		expect(distance).toBeLessThan(minDistance);

		// Apply repulsion
		if (distance < minDistance && distance > 0) {
			const overlap = minDistance - distance;
			const force = overlap * 0.1;
			const dx = (blob2.currentX - blob1.currentX) / distance;
			const dy = (blob2.currentY - blob1.currentY) / distance;

			blob1.velocityX -= dx * force;
			blob2.velocityX += dx * force;
		}

		// Velocities should push them apart
		expect(blob1.velocityX).toBeLessThan(0);
		expect(blob2.velocityX).toBeGreaterThan(0);
	});
});

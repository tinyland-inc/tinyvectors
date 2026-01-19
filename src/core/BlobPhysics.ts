/**
 * TinyVectors Full Gel Physics Simulation
 *
 * Complete physics engine with:
 * - Anti-clustering system (now O(n) with SpatialHash)
 * - Territorial movement
 * - Accelerometer forces
 * - Brownian motion
 * - Organic control point deformation (spring-damper system)
 * - Gaussian kernel smoothing
 * - Wall bouncing with chaos injection
 * - Convex hull path generation
 */

import type { ConvexBlob, GravityVector, TiltVector } from './types.js';
import { SpatialHash } from './SpatialHash.js';
import { GaussianKernel } from './GaussianKernel.js';
import { SpringSystem, DEFAULT_SPRING_CONFIG, type SpringConfig } from './SpringSystem.js';

export interface BlobPhysicsConfig {
	antiClusteringStrength: number;
	bounceDamping: number;
	deformationSpeed: number;
	territoryStrength: number;
	viscosity: number;
	/** Use spatial hash for O(n) collision detection */
	useSpatialHash: boolean;
	/** Use Gaussian kernel for smoothing */
	useGaussianSmoothing: boolean;
	/** Use spring system for deformation */
	useSpringSystem: boolean;
	/** Spring system configuration */
	springConfig: Partial<SpringConfig>;
}

const DEFAULT_CONFIG: BlobPhysicsConfig = {
	antiClusteringStrength: 0.15,
	bounceDamping: 0.7,
	deformationSpeed: 0.5,
	territoryStrength: 0.1,
	viscosity: 0.3,
	useSpatialHash: true,
	useGaussianSmoothing: true,
	useSpringSystem: true,
	springConfig: {},
};

export class BlobPhysics {
	private blobs: ConvexBlob[] = [];
	private config: BlobPhysicsConfig;
	private numBlobs: number;
	private initialized = false;

	// Mouse state
	private mouseX = 50;
	private mouseY = 50;
	private mouseVelX = 0;
	private mouseVelY = 0;
	private lastMouseX = 50;
	private lastMouseY = 50;

	// Physics state
	private gravity: GravityVector = { x: 0, y: 0 };
	private tilt: TiltVector = { x: 0, y: 0, z: 0 };
	private scrollStickiness = 0;

	// Extended physics bounds - allows blobs to extend beyond visible area
	private readonly PHYSICS_MIN = -40;
	private readonly PHYSICS_MAX = 140;

	// New physics components
	private spatialHash: SpatialHash;
	private gaussianKernel: GaussianKernel;
	private springSystem: SpringSystem;

	constructor(numBlobs: number, config: Partial<BlobPhysicsConfig> = {}) {
		this.numBlobs = numBlobs;
		this.config = { ...DEFAULT_CONFIG, ...config };

		// Initialize new physics components
		this.spatialHash = new SpatialHash(60); // Cell size ~2x personal space
		this.gaussianKernel = new GaussianKernel(5, 1.2);
		this.springSystem = new SpringSystem({
			...DEFAULT_SPRING_CONFIG,
			...this.config.springConfig,
		});
	}

	/**
	 * Initialize physics - creates blobs
	 */
	async init(): Promise<void> {
		if (this.initialized) return;
		this.initializeBlobs();
		this.initialized = true;
	}

	/**
	 * Check if physics is ready
	 */
	isReady(): boolean {
		return this.initialized;
	}

	/**
	 * Cleanup resources
	 */
	dispose(): void {
		this.blobs = [];
		this.initialized = false;
	}

	/**
	 * Update accelerometer/gravity data
	 */
	setGravity(gravity: GravityVector): void {
		this.gravity = gravity;
	}

	/**
	 * Update tilt data
	 */
	setTilt(tilt: TiltVector): void {
		this.tilt = tilt;
	}

	/**
	 * Update scroll stickiness
	 */
	setScrollStickiness(value: number): void {
		this.scrollStickiness = value;
	}

	/**
	 * Main physics tick - updates all blobs
	 */
	tick(deltaTime: number, time: number): void {
		if (!this.initialized) return;

		// Rebuild spatial hash for this frame (if enabled)
		if (this.config.useSpatialHash) {
			this.spatialHash.rebuild(this.blobs);
		}

		// Apply anti-clustering forces first
		if (this.config.useSpatialHash) {
			this.applyAntiClusteringWithSpatialHash();
		} else {
			this.applyEnhancedAntiClustering();
		}

		// Update each blob
		this.blobs.forEach((blob) =>
			this.updateScreensaverPhysics(blob, deltaTime, time)
		);

		// Decay mouse velocity
		this.mouseVelX *= 0.96;
		this.mouseVelY *= 0.96;
	}

	/**
	 * Apply anti-clustering using spatial hash (O(n) average case)
	 */
	private applyAntiClusteringWithSpatialHash(): void {
		const maxPersonalSpace = 60; // Max query radius

		for (const blob of this.blobs) {
			const neighbors = this.spatialHash.queryNeighbors(blob, maxPersonalSpace);

			for (const other of neighbors) {
				const dx = other.currentX - blob.currentX;
				const dy = other.currentY - blob.currentY;
				const distance = Math.sqrt(dx * dx + dy * dy);

				const requiredDistance = Math.max(blob.personalSpace || 50, other.personalSpace || 50);

				if (distance < requiredDistance && distance > 0) {
					const overlap = requiredDistance - distance;
					const repulsionForce = (overlap / requiredDistance) * 0.055 * this.config.antiClusteringStrength / 0.15;

					const normalizedDx = dx / distance;
					const normalizedDy = dy / distance;

					const forceMultiplier = blob.repulsionStrength || 0.03;
					const proximityMultiplier = distance < requiredDistance * 0.7 ? 3.5 : 1.0;

					// Only apply to current blob (other will get its turn)
					blob.velocityX -= normalizedDx * repulsionForce * forceMultiplier * proximityMultiplier * 0.5;
					blob.velocityY -= normalizedDy * repulsionForce * forceMultiplier * proximityMultiplier * 0.5;

					blob.lastRepulsionTime = Date.now();
				}
			}
		}
	}

	/**
	 * Update mouse position for interactions
	 */
	updateMousePosition(x: number, y: number): void {
		this.mouseVelX = x - this.lastMouseX;
		this.mouseVelY = y - this.lastMouseY;
		this.lastMouseX = this.mouseX;
		this.lastMouseY = this.mouseY;
		this.mouseX = x;
		this.mouseY = y;
	}

	/**
	 * Get blobs for rendering
	 */
	getBlobs(themeColors?: string[]): ConvexBlob[] {
		if (themeColors && themeColors.length > 0) {
			// Apply theme colors to blobs
			return this.blobs.map((blob, i) => ({
				...blob,
				color: themeColors[i % themeColors.length],
			}));
		}
		return this.blobs;
	}

	/**
	 * Generate smooth SVG path for organic blob shape
	 */
	generateSmoothBlobPath(blob: ConvexBlob): string {
		if (!blob.controlPoints || blob.controlPoints.length < 3) {
			// Fallback to circle
			const displayX = blob.currentX;
			const displayY = blob.currentY;
			const displaySize = blob.size;

			return `M ${displayX - displaySize},${displayY}
					A ${displaySize},${displaySize} 0 1,1 ${displayX + displaySize},${displayY}
					A ${displaySize},${displaySize} 0 1,1 ${displayX - displaySize},${displayY}`;
		}

		const displayX = blob.currentX;
		const displayY = blob.currentY;

		// Generate points from control points
		const points = blob.controlPoints.map((point) => {
			const x = displayX + Math.cos(point.angle) * point.radius;
			const y = displayY + Math.sin(point.angle) * point.radius;
			return { x, y };
		});

		// Apply convex hull to prevent self-intersection
		const convexPoints = this.generateConvexHull(points);

		// Build smooth curved path
		let path = `M ${convexPoints[0].x.toFixed(2)},${convexPoints[0].y.toFixed(2)}`;

		for (let i = 0; i < convexPoints.length; i++) {
			const current = convexPoints[i];
			const next = convexPoints[(i + 1) % convexPoints.length];
			const nextNext = convexPoints[(i + 2) % convexPoints.length];

			// Conservative control points for smooth curves
			const cp1x = current.x + (next.x - current.x) * 0.15;
			const cp1y = current.y + (next.y - current.y) * 0.15;
			const cp2x = next.x - (nextNext.x - current.x) * 0.05;
			const cp2y = next.y - (nextNext.y - current.y) * 0.05;

			path += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${next.x.toFixed(2)},${next.y.toFixed(2)}`;
		}

		path += ' Z';
		return path;
	}

	// ============================================================================
	// PRIVATE METHODS
	// ============================================================================

	private initializeBlobs(): void {
		this.blobs = [];

		for (let i = 0; i < this.numBlobs; i++) {
			// Spread blobs across the FULL viewBox using grid-like distribution
			const cols = Math.ceil(Math.sqrt(this.numBlobs));
			const rows = Math.ceil(this.numBlobs / cols);
			const col = i % cols;
			const row = Math.floor(i / cols);

			// Use full physics bounds with margin
			const cellWidth = (this.PHYSICS_MAX - this.PHYSICS_MIN - 40) / cols;
			const cellHeight = (this.PHYSICS_MAX - this.PHYSICS_MIN - 40) / rows;

			// Position with jitter for organic feel
			const baseX = this.PHYSICS_MIN + 20 + col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * cellWidth * 0.5;
			const baseY = this.PHYSICS_MIN + 20 + row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * cellHeight * 0.5;

			// Clamp to physics bounds
			const clampedX = Math.max(this.PHYSICS_MIN + 20, Math.min(this.PHYSICS_MAX - 20, baseX));
			const clampedY = Math.max(this.PHYSICS_MIN + 20, Math.min(this.PHYSICS_MAX - 20, baseY));

			// Smaller blob sizes for better spread
			const baseSize = 15 + Math.random() * 12;

			// Reduced control points for performance (8 instead of 16)
			const numControlPoints = 8;
			const controlPoints = [];
			const controlVelocities = [];

			for (let j = 0; j < numControlPoints; j++) {
				const pointAngle = (j / numControlPoints) * Math.PI * 2;
				const radiusVariation = 0.8 + Math.random() * 0.35;
				const pointRadius = baseSize * radiusVariation;

				controlPoints.push({
					radius: pointRadius,
					angle: pointAngle,
					targetRadius: pointRadius,
					baseRadius: pointRadius,
					pressure: 1.0,
					adhesion: 0.15 + Math.random() * 0.1,
					tension: 0.3 + Math.random() * 0.15,
				});

				controlVelocities.push({
					radialVelocity: 0,
					angularVelocity: (Math.random() - 0.5) * 0.0004,
					pressureVelocity: 0,
				});
			}

			this.blobs.push({
				baseX: clampedX,
				baseY: clampedY,
				currentX: clampedX,
				currentY: clampedY,
				velocityX: (Math.random() - 0.5) * 0.02,
				velocityY: (Math.random() - 0.5) * 0.02,
				size: baseSize,
				elasticity: 0.0004 + Math.random() * 0.0002,
				viscosity: 0.995 + Math.random() * 0.003,
				phase: Math.random() * Math.PI * 2,
				speed: 0.003 + Math.random() * 0.002,
				color: `hsl(${(i * 30) % 360}, 70%, 60%)`,
				gradientId: `blob-gradient-${i}`,
				intensity: 0.65 + Math.random() * 0.2,
				stickiness: 2,
				isAttractive: i % 2 === 0,
				mouseDistance: 100,
				isStuck: false,
				radiusVariations: [],
				fluidMass: 0.5 + Math.random() * 0.25,
				scrollAffinity: 0.3 + Math.random() * 0.5,
				surfaceTension: 0.02 + Math.random() * 0.01,
				density: 0.4 + Math.random() * 0.1,
				flowResistance: 0.002 + Math.random() * 0.001,
				controlPoints,
				controlVelocities,
				deformationStrength: 0.3 + Math.random() * 0.15,
				cohesion: 0.05 + Math.random() * 0.03,
				stretchability: 0.8 + Math.random() * 0.3,
				lastCollisionTime: 0,
				mergeThreshold: baseSize * 0.5,
				splitThreshold: baseSize * 1.5,
				isSettled: false,
				settleTime: 0,
				groundContactPoints: [],
				restHeight: baseSize * 0.7,
				wetting: 0.15 + Math.random() * 0.1,
				contactAngle: 70 + Math.random() * 30,
				pressureDistribution: new Array(numControlPoints).fill(1.0),
				chaosLevel: 0,
				turbulenceDecay: 0.985,
				expansionPhase: false,
				expansionTime: 0,
				maxExpansionTime: 20 + Math.random() * 40,
				wallBounceCount: 0,
				lastBounceTime: 0,
				driftAngle: Math.random() * Math.PI * 2,
				driftSpeed: 0.01 + Math.random() * 0.015,
				territoryRadius: 100 + Math.random() * 60,
				territoryX: clampedX,
				territoryY: clampedY,
				personalSpace: 35 + Math.random() * 20,
				repulsionStrength: 0.025 + Math.random() * 0.015,
				lastRepulsionTime: 0,
			});
		}
	}

	private applyEnhancedAntiClustering(): void {
		for (let i = 0; i < this.blobs.length; i++) {
			const blob1 = this.blobs[i];

			for (let j = i + 1; j < this.blobs.length; j++) {
				const blob2 = this.blobs[j];

				const dx = blob2.currentX - blob1.currentX;
				const dy = blob2.currentY - blob1.currentY;
				const distance = Math.sqrt(dx * dx + dy * dy);

				const requiredDistance = Math.max(blob1.personalSpace || 50, blob2.personalSpace || 50);

				if (distance < requiredDistance && distance > 0) {
					const overlap = requiredDistance - distance;
					const repulsionForce = (overlap / requiredDistance) * 0.055 * this.config.antiClusteringStrength / 0.15;

					const normalizedDx = dx / distance;
					const normalizedDy = dy / distance;

					const force1Multiplier = blob1.repulsionStrength || 0.03;
					const force2Multiplier = blob2.repulsionStrength || 0.03;

					// Stronger repulsion when very close
					const proximityMultiplier = distance < requiredDistance * 0.7 ? 3.5 : 1.0;

					blob1.velocityX -= normalizedDx * repulsionForce * force1Multiplier * proximityMultiplier;
					blob1.velocityY -= normalizedDy * repulsionForce * force1Multiplier * proximityMultiplier;

					blob2.velocityX += normalizedDx * repulsionForce * force2Multiplier * proximityMultiplier;
					blob2.velocityY += normalizedDy * repulsionForce * force2Multiplier * proximityMultiplier;

					blob1.lastRepulsionTime = Date.now();
					blob2.lastRepulsionTime = Date.now();
				}
			}
		}
	}

	private updateScreensaverPhysics(blob: ConvexBlob, deltaTime: number, time: number): void {
		// Calculate mouse distance
		blob.mouseDistance = Math.sqrt(
			Math.pow(blob.currentX - this.mouseX, 2) + Math.pow(blob.currentY - this.mouseY, 2)
		);

		// Territorial movement
		this.updateTerritorialMovement(blob, time);

		// Apply accelerometer forces
		this.applyAccelerometerForces(blob);

		// Movement with brownian motion
		this.updateMovementWithAccelerometer(blob, time);

		// Escape velocity after repulsion
		this.addEscapeVelocity(blob);

		// Organic deformation
		this.updateSafeOrganicDeformation(blob, time);

		// Scroll effects
		if (this.scrollStickiness > 0.01) {
			this.applyScrollEffect(blob);
		}

		// Update position
		blob.currentX += blob.velocityX;
		blob.currentY += blob.velocityY;

		// Wall bouncing
		this.handleWallBouncing(blob);

		// Apply friction
		blob.velocityX *= 0.992;
		blob.velocityY *= 0.992;
	}

	private applyAccelerometerForces(blob: ConvexBlob): void {
		const accelerometerStrength = 0.0008;
		const maxForce = 0.003;

		const gravityX = Math.max(-maxForce, Math.min(maxForce, this.gravity.x * accelerometerStrength));
		const gravityY = Math.max(-maxForce, Math.min(maxForce, this.gravity.y * accelerometerStrength));

		blob.velocityX += gravityX;
		blob.velocityY += gravityY;

		// Shape deformation from acceleration
		if (blob.controlPoints && (Math.abs(this.gravity.x) > 0.3 || Math.abs(this.gravity.y) > 0.3)) {
			const deformationAmount = Math.min(0.08, (Math.abs(this.gravity.x) + Math.abs(this.gravity.y)) * 0.02);
			blob.chaosLevel = Math.min((blob.chaosLevel || 0) + deformationAmount, 0.2);
		}
	}

	private updateMovementWithAccelerometer(blob: ConvexBlob, time: number): void {
		// Random drift
		const neutralDriftX = (Math.random() - 0.5) * 0.001;
		const neutralDriftY = (Math.random() - 0.5) * 0.001;

		blob.velocityX += neutralDriftX;
		blob.velocityY += neutralDriftY;

		// Brownian motion
		const brownianTime = time * 0.1 + blob.phase;
		const brownianX = Math.sin(brownianTime + (blob.driftAngle || 0)) * 0.0005;
		const brownianY = Math.cos(brownianTime * 1.3 + (blob.driftAngle || 0)) * 0.0005;

		blob.velocityX += brownianX;
		blob.velocityY += brownianY;

		// Random drift direction change
		if (Math.random() < 0.002) {
			blob.driftAngle = Math.random() * Math.PI * 2;
		}
	}

	private updateTerritorialMovement(blob: ConvexBlob, time: number): void {
		const territoryX = blob.territoryX || blob.baseX;
		const territoryY = blob.territoryY || blob.baseY;
		const territoryRadius = blob.territoryRadius || 70;

		const distanceFromTerritory = Math.sqrt(
			Math.pow(blob.currentX - territoryX, 2) + Math.pow(blob.currentY - territoryY, 2)
		);

		// Gentle pull back to territory
		if (distanceFromTerritory > territoryRadius) {
			const pullStrength = ((distanceFromTerritory - territoryRadius) / territoryRadius) * 0.0002 * this.config.territoryStrength / 0.1;
			const angleToTerritory = Math.atan2(territoryY - blob.currentY, territoryX - blob.currentX);

			blob.velocityX += Math.cos(angleToTerritory) * pullStrength;
			blob.velocityY += Math.sin(angleToTerritory) * pullStrength;
		}

		// Random drift
		blob.velocityX += (Math.random() - 0.5) * 0.003;
		blob.velocityY += (Math.random() - 0.5) * 0.003;

		// Periodic territory relocation
		if (time % 45 < 0.1) {
			const randomOffset = 35;
			blob.territoryX = Math.max(
				this.PHYSICS_MIN + 35,
				Math.min(this.PHYSICS_MAX - 35, territoryX + (Math.random() - 0.5) * randomOffset)
			);
			blob.territoryY = Math.max(
				this.PHYSICS_MIN + 35,
				Math.min(this.PHYSICS_MAX - 35, territoryY + (Math.random() - 0.5) * randomOffset)
			);
		}
	}

	private addEscapeVelocity(blob: ConvexBlob): void {
		if (blob.lastRepulsionTime && Date.now() - blob.lastRepulsionTime < 3000) {
			const escapeStrength = 0.01;
			const escapeAngle = Math.random() * Math.PI * 2;

			blob.velocityX += Math.cos(escapeAngle) * escapeStrength;
			blob.velocityY += Math.sin(escapeAngle) * escapeStrength;
		}
	}

	private updateSafeOrganicDeformation(blob: ConvexBlob, time: number): void {
		if (!blob.controlPoints || !blob.controlVelocities) return;

		if (this.config.useSpringSystem) {
			// Use spring system for physically-based deformation
			this.updateSpringDeformation(blob, time);
		} else {
			// Fallback to sinusoidal deformation
			this.updateSinusoidalDeformation(blob, time);
		}

		// Smoothing pass
		if (this.config.useGaussianSmoothing) {
			this.gaussianKernel.convolve(blob.controlPoints);
		} else {
			this.smoothControlPoints(blob);
		}
	}

	/**
	 * Spring-based deformation (physically-based gel simulation)
	 */
	private updateSpringDeformation(blob: ConvexBlob, time: number): void {
		if (!blob.controlPoints || !blob.controlVelocities) return;

		// Compute external force from blob velocity (inertial effects)
		const velocityMag = Math.sqrt(blob.velocityX * blob.velocityX + blob.velocityY * blob.velocityY);
		const velocityAngle = Math.atan2(blob.velocityY, blob.velocityX);

		// Per-point external forces based on velocity direction
		const externalForces: number[] = blob.controlPoints.map((point) => {
			// Points in the direction of motion get compressed
			const alignment = Math.cos(point.angle - velocityAngle);
			return -alignment * velocityMag * 0.5;
		});

		// Add chaos/turbulence as random forces
		if (blob.chaosLevel && blob.chaosLevel > 0.01) {
			for (let i = 0; i < externalForces.length; i++) {
				externalForces[i] += (Math.random() - 0.5) * blob.chaosLevel * 0.3;
			}
		}

		// Update spring system
		this.springSystem.updateAllControlPoints(
			blob.controlPoints,
			blob.controlVelocities,
			externalForces,
			0.016 // Fixed dt for stability
		);

		// Update angles (slow rotation)
		for (let i = 0; i < blob.controlPoints.length; i++) {
			const velocity = blob.controlVelocities[i];
			velocity.angularVelocity += (Math.random() - 0.5) * 0.00002;
			velocity.angularVelocity *= 0.998;
			velocity.angularVelocity = Math.max(-0.0006, Math.min(0.0006, velocity.angularVelocity));
			blob.controlPoints[i].angle += velocity.angularVelocity;
		}

		// Decay chaos level
		if (blob.chaosLevel) {
			blob.chaosLevel *= blob.turbulenceDecay || 0.985;
		}
	}

	/**
	 * Sinusoidal deformation (fallback, decorative only)
	 */
	private updateSinusoidalDeformation(blob: ConvexBlob, time: number): void {
		if (!blob.controlPoints || !blob.controlVelocities) return;

		blob.controlPoints.forEach((point, i) => {
			// Controlled organic pulsing
			const pulseTime = time * 0.15 * this.config.deformationSpeed / 0.5 + i * 0.4 + blob.phase;
			const pulseAmount = Math.sin(pulseTime) * 0.02;

			// Enforce min/max radius
			const minRadius = point.baseRadius * 0.85;
			const maxRadius = point.baseRadius * 1.15;

			const targetRadius = point.baseRadius * (1 + pulseAmount);
			point.targetRadius = Math.max(minRadius, Math.min(maxRadius, targetRadius));

			// Smooth radius transition
			const radiusDiff = point.targetRadius - point.radius;
			point.radius += radiusDiff * 0.008;

			// Controlled rotation
			if (blob.controlVelocities && blob.controlVelocities[i]) {
				blob.controlVelocities[i].angularVelocity += (Math.random() - 0.5) * 0.00003;
				blob.controlVelocities[i].angularVelocity *= 0.999;
				blob.controlVelocities[i].angularVelocity = Math.max(
					-0.0008,
					Math.min(0.0008, blob.controlVelocities[i].angularVelocity)
				);
				point.angle += blob.controlVelocities[i].angularVelocity;
			}
		});
	}

	private smoothControlPoints(blob: ConvexBlob): void {
		if (!blob.controlPoints || blob.controlPoints.length < 3) return;

		for (let i = 0; i < blob.controlPoints.length; i++) {
			const current = blob.controlPoints[i];
			const prev = blob.controlPoints[(i - 1 + blob.controlPoints.length) % blob.controlPoints.length];
			const next = blob.controlPoints[(i + 1) % blob.controlPoints.length];

			// Smooth radius variations
			const avgRadius = (prev.radius + current.radius + next.radius) / 3;
			const smoothingFactor = 0.05;
			current.radius = current.radius * (1 - smoothingFactor) + avgRadius * smoothingFactor;

			// Prevent sharp transitions
			const minRadiusDiff = blob.size * 0.1;
			if (Math.abs(current.radius - prev.radius) > minRadiusDiff) {
				const adjustment = (Math.abs(current.radius - prev.radius) - minRadiusDiff) * 0.5;
				if (current.radius > prev.radius) {
					current.radius -= adjustment;
					prev.radius += adjustment;
				} else {
					current.radius += adjustment;
					prev.radius -= adjustment;
				}
			}
		}
	}

	private applyScrollEffect(blob: ConvexBlob): void {
		const attractionStrength = this.scrollStickiness * blob.scrollAffinity * 0.0002;
		blob.velocityX += (this.mouseX - blob.currentX) * attractionStrength;
		blob.velocityY += (this.mouseY - blob.currentY) * attractionStrength;

		if (this.scrollStickiness > 0.15) {
			blob.chaosLevel = Math.min((blob.chaosLevel || 0) + this.scrollStickiness * 0.02, 0.15);
		}
	}

	private handleWallBouncing(blob: ConvexBlob): void {
		const margin = blob.size * 0.8;
		const damping = this.config.bounceDamping;
		const currentTime = Date.now();

		// Left wall
		if (blob.currentX < this.PHYSICS_MIN + margin) {
			blob.currentX = this.PHYSICS_MIN + margin;
			blob.velocityX = Math.abs(blob.velocityX) * damping;
			this.recordBounce(blob, currentTime);
		}

		// Right wall
		if (blob.currentX > this.PHYSICS_MAX - margin) {
			blob.currentX = this.PHYSICS_MAX - margin;
			blob.velocityX = -Math.abs(blob.velocityX) * damping;
			this.recordBounce(blob, currentTime);
		}

		// Top wall
		if (blob.currentY < this.PHYSICS_MIN + margin * 1.5) {
			blob.currentY = this.PHYSICS_MIN + margin * 1.5;
			blob.velocityY = Math.abs(blob.velocityY) * damping;
			this.recordBounce(blob, currentTime);
		}

		// Bottom wall
		if (blob.currentY > this.PHYSICS_MAX - margin * 1.5) {
			blob.currentY = this.PHYSICS_MAX - margin * 1.5;
			blob.velocityY = -Math.abs(blob.velocityY) * damping;
			this.recordBounce(blob, currentTime);
		}
	}

	private recordBounce(blob: ConvexBlob, currentTime: number): void {
		blob.wallBounceCount = (blob.wallBounceCount || 0) + 1;
		blob.lastBounceTime = currentTime;

		// Add randomness after bounce
		blob.velocityX += (Math.random() - 0.5) * 0.05;
		blob.velocityY += (Math.random() - 0.5) * 0.05;

		// Change drift direction
		blob.driftAngle = Math.random() * Math.PI * 2;

		// Shape disturbance from impact
		if (blob.controlPoints) {
			blob.chaosLevel = Math.min((blob.chaosLevel || 0) + 0.04, 0.15);
		}
	}

	private generateConvexHull(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
		if (points.length < 3) return points;

		// Safety: limit iterations to prevent infinite loops
		const maxIterations = points.length * 2;
		let iterations = 0;

		const hull: Array<{ x: number; y: number }> = [];

		// Find bottommost point
		let startPoint = points[0];
		let startIndex = 0;
		for (let i = 0; i < points.length; i++) {
			const point = points[i];
			if (point.y < startPoint.y || (point.y === startPoint.y && point.x < startPoint.x)) {
				startPoint = point;
				startIndex = i;
			}
		}

		let currentIndex = startIndex;
		do {
			hull.push(points[currentIndex]);
			let nextIndex = 0;

			for (let i = 0; i < points.length; i++) {
				if (nextIndex === currentIndex || this.isLeftTurn(points[currentIndex], points[nextIndex], points[i])) {
					nextIndex = i;
				}
			}

			currentIndex = nextIndex;
			iterations++;
		} while (currentIndex !== startIndex && hull.length < points.length && iterations < maxIterations);

		return hull;
	}

	private isLeftTurn(
		p1: { x: number; y: number },
		p2: { x: number; y: number },
		p3: { x: number; y: number }
	): boolean {
		return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x) > 0;
	}
}

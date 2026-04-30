













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
	
	useSpatialHash: boolean;
	
	useGaussianSmoothing: boolean;
	
	useSpringSystem: boolean;
	
	springConfig: Partial<SpringConfig>;
}

export const DEFAULT_BLOB_PHYSICS_CONFIG: BlobPhysicsConfig = {
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

	
	private mouseX = 50;
	private mouseY = 50;
	private mouseVelX = 0;
	private mouseVelY = 0;
	private lastMouseX = 50;
	private lastMouseY = 50;

	
	private gravity: GravityVector = { x: 0, y: 0 };
	private tilt: TiltVector = { x: 0, y: 0, z: 0 };
	private scrollStickiness = 0;

	
	private readonly PHYSICS_MIN = -40;
	private readonly PHYSICS_MAX = 140;

	
	private spatialHash: SpatialHash;
	private gaussianKernel: GaussianKernel;
	private springSystem: SpringSystem;

	// Pre-allocated scratch buffers for hot-path passes (no per-frame allocation).
	private skinTensionScratch: Float32Array | null = null;
	private xsphDvX: Float32Array | null = null;
	private xsphDvY: Float32Array | null = null;

	constructor(numBlobs: number, config: Partial<BlobPhysicsConfig> = {}) {
		this.numBlobs = numBlobs;
		this.config = { ...DEFAULT_BLOB_PHYSICS_CONFIG, ...config };

		
		this.spatialHash = new SpatialHash(60); 
		this.gaussianKernel = new GaussianKernel(5, 1.2);
		this.springSystem = new SpringSystem({
			...DEFAULT_SPRING_CONFIG,
			...this.config.springConfig,
		});
	}

	


	async init(): Promise<void> {
		if (this.initialized) return;
		this.initializeBlobs();
		this.initialized = true;
	}

	


	isReady(): boolean {
		return this.initialized;
	}

	


	dispose(): void {
		this.blobs = [];
		this.initialized = false;
	}

	


	setGravity(gravity: GravityVector): void {
		this.gravity = gravity;
	}

	


	setTilt(tilt: TiltVector): void {
		this.tilt = tilt;
	}

	


	setScrollStickiness(value: number): void {
		this.scrollStickiness = value;
	}

	


	tick(deltaTime: number, time: number): void {
		if (!this.initialized) return;

		
		if (this.config.useSpatialHash) {
			this.spatialHash.rebuild(this.blobs);
		}

		
		if (this.config.useSpatialHash) {
			this.applyAntiClusteringWithSpatialHash();
		} else {
			this.applyEnhancedAntiClustering();
		}

		
		this.blobs.forEach((blob) =>
			this.updateScreensaverPhysics(blob, deltaTime, time)
		);

		// XSPH viscosity coupling — each blob's velocity drifts toward its
		// neighborhood-weighted velocity. This is what makes the swarm
		// behave as a fluid rather than 5 independent things; drag bleeds
		// absolute motion, XSPH bleeds *relative* motion between neighbors.
		// Macklin & Müller, Position Based Fluids, SIGGRAPH 2013.
		this.applyXSPHCoupling();


		this.mouseVelX *= 0.96;
		this.mouseVelY *= 0.96;
	}

	private applyXSPHCoupling(): void {
		const blobs = this.blobs;
		const n = blobs.length;
		if (n < 2) return;

		if (!this.xsphDvX || !this.xsphDvY || this.xsphDvX.length < n) {
			this.xsphDvX = new Float32Array(n);
			this.xsphDvY = new Float32Array(n);
		}
		const dvX = this.xsphDvX;
		const dvY = this.xsphDvY;
		dvX.fill(0);
		dvY.fill(0);

		const eps = 0.4;
		const sigma = 80;
		const twoSigmaSq = 2 * sigma * sigma;

		for (let i = 0; i < n; i++) {
			const a = blobs[i];
			for (let j = i + 1; j < n; j++) {
				const b = blobs[j];
				const dx = b.currentX - a.currentX;
				const dy = b.currentY - a.currentY;
				const w = Math.exp(-(dx * dx + dy * dy) / twoSigmaSq);
				const dvx = w * (b.velocityX - a.velocityX);
				const dvy = w * (b.velocityY - a.velocityY);
				dvX[i] += dvx;
				dvY[i] += dvy;
				dvX[j] -= dvx;
				dvY[j] -= dvy;
			}
		}

		for (let i = 0; i < n; i++) {
			blobs[i].velocityX += eps * dvX[i];
			blobs[i].velocityY += eps * dvY[i];
		}
	}

	


	// Anti-clustering with Gaussian-falloff repulsion. The previous step-
	// function variant ((distance < requiredDistance) ? force : 0, plus
	// a separate sharp proximity multiplier at requiredDistance * 0.7)
	// produced a discontinuous force read as a "click" on near-contact.
	// exp(-r² / 2σ²) is C∞ smooth — force grows continuously, peaks at
	// zero distance, decays smoothly. Reuses the same Gaussian family as
	// the existing GaussianKernel.
	private applyAntiClusteringWithSpatialHash(): void {
		const maxPersonalSpace = 60;

		for (const blob of this.blobs) {
			const neighbors = this.spatialHash.queryNeighbors(blob, maxPersonalSpace);

			for (const other of neighbors) {
				const dx = other.currentX - blob.currentX;
				const dy = other.currentY - blob.currentY;
				const distance = Math.sqrt(dx * dx + dy * dy);
				if (distance <= 0) continue;

				const requiredDistance = Math.max(
					blob.personalSpace || 50,
					other.personalSpace || 50
				);
				const sigma = requiredDistance * 0.5;
				const w = Math.exp(-(distance * distance) / (2 * sigma * sigma));
				const repulsionForce =
					w * 0.055 * (this.config.antiClusteringStrength / 0.15);

				const normalizedDx = dx / distance;
				const normalizedDy = dy / distance;
				const forceMultiplier = blob.repulsionStrength || 0.03;

				blob.velocityX -= normalizedDx * repulsionForce * forceMultiplier;
				blob.velocityY -= normalizedDy * repulsionForce * forceMultiplier;

				// Force is now Gaussian (continuous, applies at any range
				// inside the spatial-hash query). lastRepulsionTime stays
				// gated on the close-contact threshold because downstream
				// addEscapeVelocity uses it as a "blobs were just pushing
				// each other apart" event detector — not as a generic
				// "any neighbor contributed" flag. Decoupling is intentional.
				if (distance < requiredDistance) {
					blob.lastRepulsionTime = Date.now();
				}
			}
		}
	}




	updateMousePosition(x: number, y: number): void {
		this.mouseVelX = x - this.lastMouseX;
		this.mouseVelY = y - this.lastMouseY;
		this.lastMouseX = this.mouseX;
		this.lastMouseY = this.mouseY;
		this.mouseX = x;
		this.mouseY = y;
	}

	


	// Mutate blob.color in place when themeColors is supplied — kills the
	// 300 object spreads/sec the previous .map(blob => ({...blob, color}))
	// performed at 5 blobs × 60 fps. Return a *shallow copy* so the array
	// reference is fresh each call: TinyVectors.svelte assigns the result
	// to a $state rune inside its rAF loop, and Svelte 5's signal compares
	// by reference — returning the same array would freeze the animation
	// after frame 1. Same blob object refs across calls; only the outer
	// array shell is reallocated.
	getBlobs(themeColors?: string[]): ConvexBlob[] {
		if (themeColors && themeColors.length > 0) {
			for (let i = 0; i < this.blobs.length; i++) {
				this.blobs[i].color = themeColors[i % themeColors.length];
			}
		}
		return this.blobs.slice();
	}

	


	generateSmoothBlobPath(blob: ConvexBlob): string {
		if (!blob.controlPoints || blob.controlPoints.length < 3) {
			
			const displayX = blob.currentX;
			const displayY = blob.currentY;
			const displaySize = blob.size;

			return `M ${displayX - displaySize},${displayY}
					A ${displaySize},${displaySize} 0 1,1 ${displayX + displaySize},${displayY}
					A ${displaySize},${displaySize} 0 1,1 ${displayX - displaySize},${displayY}`;
		}

		const displayX = blob.currentX;
		const displayY = blob.currentY;

		
		const points = blob.controlPoints.map((point) => {
			const x = displayX + Math.cos(point.angle) * point.radius;
			const y = displayY + Math.sin(point.angle) * point.radius;
			return { x, y };
		});

		
		const convexPoints = this.generateConvexHull(points);

		// Numbers are interpolated directly: Number.prototype.toString() in
		// V8 is faster than toFixed and SVG accepts any precision. Each
		// .toFixed call allocated a fresh string ~18,000 times/sec at
		// 5 blobs × 12 control points × 60 fps.
		let path = `M ${convexPoints[0].x},${convexPoints[0].y}`;

		for (let i = 0; i < convexPoints.length; i++) {
			const current = convexPoints[i];
			const next = convexPoints[(i + 1) % convexPoints.length];
			const nextNext = convexPoints[(i + 2) % convexPoints.length];

			const cp1x = current.x + (next.x - current.x) * 0.15;
			const cp1y = current.y + (next.y - current.y) * 0.15;
			const cp2x = next.x - (nextNext.x - current.x) * 0.05;
			const cp2y = next.y - (nextNext.y - current.y) * 0.05;

			path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
		}

		path += ' Z';
		return path;
	}

	
	
	

	private initializeBlobs(): void {
		this.blobs = [];

		for (let i = 0; i < this.numBlobs; i++) {
			
			const cols = Math.ceil(Math.sqrt(this.numBlobs));
			const rows = Math.ceil(this.numBlobs / cols);
			const col = i % cols;
			const row = Math.floor(i / cols);

			
			const cellWidth = (this.PHYSICS_MAX - this.PHYSICS_MIN - 40) / cols;
			const cellHeight = (this.PHYSICS_MAX - this.PHYSICS_MIN - 40) / rows;

			
			const baseX = this.PHYSICS_MIN + 20 + col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * cellWidth * 0.5;
			const baseY = this.PHYSICS_MIN + 20 + row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * cellHeight * 0.5;

			
			const clampedX = Math.max(this.PHYSICS_MIN + 20, Math.min(this.PHYSICS_MAX - 20, baseX));
			const clampedY = Math.max(this.PHYSICS_MIN + 20, Math.min(this.PHYSICS_MAX - 20, baseY));

			
			const baseSize = 15 + Math.random() * 12;

			
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

	// Fallback when useSpatialHash is false. Same Gaussian-falloff
	// repulsion as applyAntiClusteringWithSpatialHash, applied
	// pairwise in O(N²).
	private applyEnhancedAntiClustering(): void {
		for (let i = 0; i < this.blobs.length; i++) {
			const blob1 = this.blobs[i];

			for (let j = i + 1; j < this.blobs.length; j++) {
				const blob2 = this.blobs[j];

				const dx = blob2.currentX - blob1.currentX;
				const dy = blob2.currentY - blob1.currentY;
				const distance = Math.sqrt(dx * dx + dy * dy);
				if (distance <= 0) continue;

				const requiredDistance = Math.max(
					blob1.personalSpace || 50,
					blob2.personalSpace || 50
				);
				const sigma = requiredDistance * 0.5;
				const w = Math.exp(-(distance * distance) / (2 * sigma * sigma));
				const repulsionForce =
					w * 0.055 * (this.config.antiClusteringStrength / 0.15);

				const normalizedDx = dx / distance;
				const normalizedDy = dy / distance;
				const force1Multiplier = blob1.repulsionStrength || 0.03;
				const force2Multiplier = blob2.repulsionStrength || 0.03;

				blob1.velocityX -= normalizedDx * repulsionForce * force1Multiplier;
				blob1.velocityY -= normalizedDy * repulsionForce * force1Multiplier;

				blob2.velocityX += normalizedDx * repulsionForce * force2Multiplier;
				blob2.velocityY += normalizedDy * repulsionForce * force2Multiplier;

				if (distance < requiredDistance) {
					blob1.lastRepulsionTime = Date.now();
					blob2.lastRepulsionTime = Date.now();
				}
			}
		}
	}

	private updateScreensaverPhysics(blob: ConvexBlob, deltaTime: number, time: number): void {
		
		blob.mouseDistance = Math.sqrt(
			Math.pow(blob.currentX - this.mouseX, 2) + Math.pow(blob.currentY - this.mouseY, 2)
		);

		
		this.updateTerritorialMovement(blob, time);

		
		this.applyAccelerometerForces(blob);

		
		this.updateMovementWithAccelerometer(blob, time);

		
		this.addEscapeVelocity(blob);

		
		this.updateSafeOrganicDeformation(blob, time);

		
		if (this.scrollStickiness > 0.01) {
			this.applyScrollEffect(blob);
		}

		
		blob.currentX += blob.velocityX;
		blob.currentY += blob.velocityY;

		
		this.handleWallBouncing(blob);

		
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

		
		if (blob.controlPoints && (Math.abs(this.gravity.x) > 0.3 || Math.abs(this.gravity.y) > 0.3)) {
			const deformationAmount = Math.min(0.08, (Math.abs(this.gravity.x) + Math.abs(this.gravity.y)) * 0.02);
			blob.chaosLevel = Math.min((blob.chaosLevel || 0) + deformationAmount, 0.2);
		}
	}

	private updateMovementWithAccelerometer(blob: ConvexBlob, time: number): void {
		
		const neutralDriftX = (Math.random() - 0.5) * 0.001;
		const neutralDriftY = (Math.random() - 0.5) * 0.001;

		blob.velocityX += neutralDriftX;
		blob.velocityY += neutralDriftY;

		
		const brownianTime = time * 0.1 + blob.phase;
		const brownianX = Math.sin(brownianTime + (blob.driftAngle || 0)) * 0.0005;
		const brownianY = Math.cos(brownianTime * 1.3 + (blob.driftAngle || 0)) * 0.0005;

		blob.velocityX += brownianX;
		blob.velocityY += brownianY;

		
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

		
		if (distanceFromTerritory > territoryRadius) {
			const pullStrength = ((distanceFromTerritory - territoryRadius) / territoryRadius) * 0.0002 * this.config.territoryStrength / 0.1;
			const angleToTerritory = Math.atan2(territoryY - blob.currentY, territoryX - blob.currentX);

			blob.velocityX += Math.cos(angleToTerritory) * pullStrength;
			blob.velocityY += Math.sin(angleToTerritory) * pullStrength;
		}

		
		blob.velocityX += (Math.random() - 0.5) * 0.003;
		blob.velocityY += (Math.random() - 0.5) * 0.003;

		
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
			
			this.updateSpringDeformation(blob, time);
		} else {
			
			this.updateSinusoidalDeformation(blob, time);
		}

		
		if (this.config.useGaussianSmoothing) {
			this.gaussianKernel.convolve(blob.controlPoints);
		} else {
			this.smoothControlPoints(blob);
		}
	}

	


	private updateSpringDeformation(blob: ConvexBlob, time: number): void {
		if (!blob.controlPoints || !blob.controlVelocities) return;

		
		const velocityMag = Math.sqrt(blob.velocityX * blob.velocityX + blob.velocityY * blob.velocityY);
		const velocityAngle = Math.atan2(blob.velocityY, blob.velocityX);

		
		const externalForces: number[] = blob.controlPoints.map((point) => {
			
			const alignment = Math.cos(point.angle - velocityAngle);
			return -alignment * velocityMag * 0.5;
		});

		
		if (blob.chaosLevel && blob.chaosLevel > 0.01) {
			for (let i = 0; i < externalForces.length; i++) {
				externalForces[i] += (Math.random() - 0.5) * blob.chaosLevel * 0.3;
			}
		}

		
		this.springSystem.updateAllControlPoints(
			blob.controlPoints,
			blob.controlVelocities,
			externalForces,
			0.016 
		);

		
		for (let i = 0; i < blob.controlPoints.length; i++) {
			const velocity = blob.controlVelocities[i];
			velocity.angularVelocity += (Math.random() - 0.5) * 0.00002;
			velocity.angularVelocity *= 0.998;
			velocity.angularVelocity = Math.max(-0.0006, Math.min(0.0006, velocity.angularVelocity));
			blob.controlPoints[i].angle += velocity.angularVelocity;
		}

		
		if (blob.chaosLevel) {
			blob.chaosLevel *= blob.turbulenceDecay || 0.985;
		}
	}

	


	private updateSinusoidalDeformation(blob: ConvexBlob, time: number): void {
		if (!blob.controlPoints || !blob.controlVelocities) return;

		blob.controlPoints.forEach((point, i) => {
			
			const pulseTime = time * 0.15 * this.config.deformationSpeed / 0.5 + i * 0.4 + blob.phase;
			const pulseAmount = Math.sin(pulseTime) * 0.02;

			
			const minRadius = point.baseRadius * 0.85;
			const maxRadius = point.baseRadius * 1.15;

			const targetRadius = point.baseRadius * (1 + pulseAmount);
			point.targetRadius = Math.max(minRadius, Math.min(maxRadius, targetRadius));

			
			const radiusDiff = point.targetRadius - point.radius;
			point.radius += radiusDiff * 0.008;

			
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

	// Laplacian skin-tension pass on the perimeter ring.
	// r_i ← r_i + k · (0.5·(r_{i-1} + r_{i+1}) - r_i)  is the discrete
	// surface-tension force on a closed control-point ring (Young-Laplace
	// pressure). Two-pass: read all targets first, then write — otherwise
	// we'd be smoothing against half-already-smoothed neighbors.
	// Plus a viscous radial-velocity bleed (Kelvin-Voigt dashpot half) so
	// energy dissipates with each correction rather than ringing as it
	// did with the previous spring-only model.
	private smoothControlPoints(blob: ConvexBlob): void {
		const cp = blob.controlPoints;
		if (!cp || cp.length < 3) return;
		const n = cp.length;
		if (!this.skinTensionScratch || this.skinTensionScratch.length < n) {
			this.skinTensionScratch = new Float32Array(n);
		}
		const target = this.skinTensionScratch;
		const k = 0.15;

		for (let i = 0; i < n; i++) {
			const prev = cp[(i - 1 + n) % n].radius;
			const next = cp[(i + 1) % n].radius;
			target[i] = 0.5 * (prev + next);
		}
		for (let i = 0; i < n; i++) {
			cp[i].radius += (target[i] - cp[i].radius) * k;
			const v = blob.controlVelocities?.[i];
			if (v) v.radialVelocity *= 1 - 0.5 * k;
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

	// Soft-wall force: continuous penetration-based restoring force, no
	// specular reflection or position snap. Edges deform along the wall
	// (the blob "flattens") rather than bouncing — the gel cue.
	private handleWallBouncing(blob: ConvexBlob): void {
		const margin = blob.size * 0.8;
		const yMargin = margin * 1.5;
		const k = 0.08;
		const currentTime = Date.now();

		const minX = this.PHYSICS_MIN + margin;
		const maxX = this.PHYSICS_MAX - margin;
		const minY = this.PHYSICS_MIN + yMargin;
		const maxY = this.PHYSICS_MAX - yMargin;

		const px =
			Math.max(0, minX - blob.currentX) - Math.max(0, blob.currentX - maxX);
		const py =
			Math.max(0, minY - blob.currentY) - Math.max(0, blob.currentY - maxY);

		if (px !== 0) blob.velocityX += k * px;
		if (py !== 0) blob.velocityY += k * py;

		// Hard outer clamp — far outside the soft band, snap back so the
		// blob can never escape the canvas under extreme dt or large
		// external forces. Records a bounce so existing time-since-bounce
		// logic continues to work.
		const hardMargin = blob.size * 0.2;
		const hardMinX = this.PHYSICS_MIN + hardMargin;
		const hardMaxX = this.PHYSICS_MAX - hardMargin;
		const hardMinY = this.PHYSICS_MIN + hardMargin;
		const hardMaxY = this.PHYSICS_MAX - hardMargin;
		const hardDamping = this.config.bounceDamping;

		if (blob.currentX < hardMinX) {
			blob.currentX = hardMinX;
			blob.velocityX = Math.abs(blob.velocityX) * hardDamping;
			this.recordBounce(blob, currentTime);
		} else if (blob.currentX > hardMaxX) {
			blob.currentX = hardMaxX;
			blob.velocityX = -Math.abs(blob.velocityX) * hardDamping;
			this.recordBounce(blob, currentTime);
		}
		if (blob.currentY < hardMinY) {
			blob.currentY = hardMinY;
			blob.velocityY = Math.abs(blob.velocityY) * hardDamping;
			this.recordBounce(blob, currentTime);
		} else if (blob.currentY > hardMaxY) {
			blob.currentY = hardMaxY;
			blob.velocityY = -Math.abs(blob.velocityY) * hardDamping;
			this.recordBounce(blob, currentTime);
		}
	}

	private recordBounce(blob: ConvexBlob, currentTime: number): void {
		blob.wallBounceCount = (blob.wallBounceCount || 0) + 1;
		blob.lastBounceTime = currentTime;

		
		blob.velocityX += (Math.random() - 0.5) * 0.05;
		blob.velocityY += (Math.random() - 0.5) * 0.05;

		
		blob.driftAngle = Math.random() * Math.PI * 2;

		
		if (blob.controlPoints) {
			blob.chaosLevel = Math.min((blob.chaosLevel || 0) + 0.04, 0.15);
		}
	}

	private generateConvexHull(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
		if (points.length < 3) return points;

		
		const maxIterations = points.length * 2;
		let iterations = 0;

		const hull: Array<{ x: number; y: number }> = [];

		
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

/**
 * Core module - Physics, path generation, and types
 * Framework-agnostic, can be used without Svelte
 */

// Types
export * from './types.js';

// Schema and configuration
export * from './schema.js';

// Physics engine
export { BlobPhysics, type BlobPhysicsConfig } from './BlobPhysics.js';

// Path generation
export {
	generateSmoothBlobPath,
	generateSmoothBlobPathSync,
	preInitPathGenerator,
} from './PathGenerator.js';

// Browser detection utility
export { browser, isBrowser } from './browser.js';

// Gaussian smoothing
export { GaussianKernel } from './GaussianKernel.js';

// Spatial partitioning for O(n) collision detection
export { SpatialHash } from './SpatialHash.js';

// Spring system for gel physics
export {
	SpringSystem,
	type SpringConfig,
	type GelControlPoint,
	DEFAULT_SPRING_CONFIG,
	computePolygonArea,
	computeCircularity,
	enforceAreaConservation,
	createControlPointVelocities,
} from './SpringSystem.js';

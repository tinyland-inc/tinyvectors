/**
 * TinyVectors Schema v1.0.0
 * Comprehensive type definitions for the TinyVectors animation system
 *
 * This schema defines all configuration options, types, and interfaces
 * for extracting TinyVectors into an independent npm package.
 */

import type { ControlPoint, ControlPointVelocity, DeviceMotionData } from './types.js';

// ============================================================================
// CORE CONFIGURATION
// ============================================================================

/**
 * Main configuration interface for TinyVectors
 */
export interface TinyVectorsConfig {
	/** Schema version */
	version: '1.0.0';

	/** Core animation settings */
	core: CoreConfig;

	/** Physics simulation settings */
	physics: PhysicsConfig;

	/** Rendering settings */
	rendering: RenderingConfig;

	/** Theme and color settings */
	theme: ThemeConfig;

	/** Optional feature flags */
	features: FeatureFlags;
}

/**
 * Core animation configuration
 */
export interface CoreConfig {
	/** Number of blobs to render (default: 12) */
	blobCount: number;

	/** Minimum blob radius in viewBox units (default: 40) */
	minRadius: number;

	/** Maximum blob radius in viewBox units (default: 160) */
	maxRadius: number;

	/** Target frames per second (default: 60) */
	fps: number;

	/** Whether animation is enabled (default: true) */
	animated: boolean;

	/** Delay before animation starts in ms (default: 0) */
	startDelay: number;
}

/**
 * Physics simulation configuration
 */
export interface PhysicsConfig {
	/** Fluid viscosity (0.0-1.0, default: 0.3) */
	viscosity: number;

	/** Wall bounce damping (0.0-1.0, default: 0.7) */
	bounceDamping: number;

	/** Deformation animation speed (0.1-2.0, default: 0.5) */
	deformationSpeed: number;

	/** Strength of territory attraction (0.0-1.0, default: 0.1) */
	territoryStrength: number;

	/** Anti-clustering repulsion strength (0.0-1.0, default: 0.15) */
	antiClusteringStrength: number;

	/** Maximum velocity magnitude (default: 5.0) */
	maxVelocity: number;

	/** Gravity influence (0.0-1.0, default: 0.0) */
	gravity: number;
}

/**
 * Rendering configuration
 */
export interface RenderingConfig {
	/** Number of render layers (3 or 4, default: 4) */
	layers: 3 | 4;

	/** Main blur radius in pixels (0.5-3.0, default: 1.5) */
	blurRadius: number;

	/** Glow effect blur radius (2.0-6.0, default: 4.0) */
	glowRadius: number;

	/** Glow layer opacity (0.1-0.5, default: 0.35) */
	glowOpacity: number;

	/** Enable floating particles (default: true) */
	enableParticles: boolean;

	/** Particles per blob (1-5, default: 3) */
	particlesPerBlob: number;

	/** SVG viewBox configuration */
	viewBox: {
		/** Margin for overflow (default: 33) */
		margin: number;
		/** ViewBox size (default: 100) */
		size: number;
	};
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
	/** Color mode */
	mode: 'light' | 'dark' | 'system';

	/** Built-in theme preset */
	preset: ThemePresetName;

	/** Custom colors (overrides preset) */
	colors?: ThemeColor[];

	/** CSS custom property prefix (default: '--vector-') */
	cssPrefix: string;

	/** Blend mode for light theme */
	blendModeLight: BlendMode;

	/** Blend mode for dark theme */
	blendModeDark: BlendMode;
}

/**
 * Feature flags for optional capabilities
 */
export interface FeatureFlags {
	/** Enable device motion (accelerometer) support (default: true) */
	deviceMotion: boolean;

	/** Enable scroll-based physics (default: true) */
	scrollPhysics: boolean;

	/** Lazy load component (default: true) */
	lazyLoad: boolean;

	/** Use Web Worker for physics (default: false) */
	webWorker: boolean;

	/** Use WASM acceleration (default: false) */
	wasmAcceleration: boolean;

	/** Enable debug overlay (default: false) */
	debug: boolean;
}

// ============================================================================
// THEME TYPES
// ============================================================================

/** Available built-in theme presets */
export type ThemePresetName = 'tinyland' | 'trans' | 'pride' | 'high-contrast' | 'custom';

/** SVG blend modes */
export type BlendMode = 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'normal';

/**
 * Theme color definition
 */
export interface ThemeColor {
	/** Unique identifier */
	id: string;

	/** Color value (oklch, rgba, hex) */
	color: string;

	/** Whether this color attracts other blobs */
	attractive: boolean;

	/** Scroll responsiveness (0.0-1.0) */
	scrollAffinity: number;

	/** Layer assignment */
	layer: 'background' | 'mid' | 'foreground';
}

/**
 * Complete theme preset definition
 */
export interface ThemePreset {
	/** Theme name */
	name: ThemePresetName;

	/** Display label */
	label: string;

	/** Theme colors */
	colors: ThemeColor[];

	/** Light mode blend */
	blendModeLight: BlendMode;

	/** Dark mode blend */
	blendModeDark: BlendMode;

	/** Whether this theme supports vectors */
	hasVectors: boolean;
}

// ============================================================================
// BLOB TYPES
// ============================================================================

/**
 * Core blob properties (minimal)
 */
export interface BlobCore {
	/** Unique identifier */
	id: number;

	/** Current X position */
	x: number;

	/** Current Y position */
	y: number;

	/** X velocity */
	vx: number;

	/** Y velocity */
	vy: number;

	/** Base radius */
	radius: number;

	/** Color value */
	color: string;
}

/**
 * Extended blob for rendering (used by BlobSVG)
 */
export interface RenderBlob extends BlobCore {
	/** Base X position (territory center) */
	baseX: number;

	/** Base Y position (territory center) */
	baseY: number;

	/** Current rendered X */
	currentX: number;

	/** Current rendered Y */
	currentY: number;

	/** Rendered size */
	size: number;

	/** Animation phase offset */
	phase: number;

	/** Animation speed multiplier */
	speed: number;

	/** Unique gradient ID for SVG */
	gradientId: string;

	/** Color intensity (0.0-1.0) */
	intensity: number;

	/** Whether blob is "sticky" */
	stickiness: number;

	/** Physics properties */
	elasticity: number;
	viscosity: number;
	fluidMass: number;

	/** Scroll response */
	scrollAffinity: number;
	isAttractive: boolean;

	/** Mouse interaction state */
	mouseDistance: number;
	isStuck: boolean;

	/** Shape deformation data */
	radiusVariations: number[];
}

/**
 * Full physics blob with all optional properties
 * Extends RenderBlob with advanced simulation data
 */
export interface PhysicsBlob extends RenderBlob {
	/** Surface tension coefficient */
	surfaceTension?: number;

	/** Density for mass calculations */
	density?: number;

	/** Flow resistance coefficient */
	flowResistance?: number;

	/** Control points for organic deformation */
	controlPoints?: ControlPoint[];

	/** Velocity data for control points */
	controlVelocities?: ControlPointVelocity[];

	/** Deformation magnitude */
	deformationStrength?: number;

	/** Cohesion factor */
	cohesion?: number;

	/** Stretch limit */
	stretchability?: number;

	/** Territory data */
	territoryRadius?: number;
	territoryX?: number;
	territoryY?: number;

	/** Anti-clustering */
	personalSpace?: number;
	repulsionStrength?: number;
}

// Re-export types from types.ts (canonical source)
export type { ControlPoint, ControlPointVelocity, DeviceMotionData };

/**
 * Scroll input data
 */
export interface ScrollData {
	/** Current scroll Y position */
	y: number;

	/** Scroll velocity */
	velocity: number;

	/** Scroll direction */
	direction: 'up' | 'down' | 'idle';

	/** Peak velocity this session */
	peakVelocity?: number;

	/** Total distance scrolled */
	totalDistance?: number;
}

/**
 * Mouse/pointer input data
 */
export interface PointerData {
	/** X position (0-100 viewBox units) */
	x: number;

	/** Y position (0-100 viewBox units) */
	y: number;

	/** Whether pointer is active */
	active: boolean;

	/** Pointer velocity X */
	vx?: number;

	/** Pointer velocity Y */
	vy?: number;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * TinyVectors event types
 */
export type TinyVectorsEventType =
	| 'init'
	| 'frame'
	| 'themeChange'
	| 'modeChange'
	| 'resize'
	| 'collision'
	| 'dispose';

/**
 * Event handler callback
 */
export type TinyVectorsEventHandler<T = unknown> = (event: TinyVectorsEvent<T>) => void;

/**
 * Generic event structure
 */
export interface TinyVectorsEvent<T = unknown> {
	/** Event type */
	type: TinyVectorsEventType;

	/** Timestamp */
	timestamp: number;

	/** Event-specific data */
	data: T;
}

/**
 * Frame event data
 */
export interface FrameEventData {
	/** Delta time since last frame (ms) */
	deltaTime: number;

	/** Current frame number */
	frame: number;

	/** Current FPS */
	fps: number;

	/** Blob states */
	blobs: RenderBlob[];
}

/**
 * Theme change event data
 */
export interface ThemeChangeEventData {
	/** Previous theme */
	from: ThemePresetName;

	/** New theme */
	to: ThemePresetName;

	/** Color mode */
	mode: 'light' | 'dark';
}

// ============================================================================
// DEFAULTS
// ============================================================================

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: TinyVectorsConfig = {
	version: '1.0.0',

	core: {
		blobCount: 12,
		minRadius: 40,
		maxRadius: 160,
		fps: 60,
		animated: true,
		startDelay: 0,
	},

	physics: {
		viscosity: 0.3,
		bounceDamping: 0.7,
		deformationSpeed: 0.5,
		territoryStrength: 0.1,
		antiClusteringStrength: 0.15,
		maxVelocity: 5.0,
		gravity: 0.0,
	},

	rendering: {
		layers: 4,
		blurRadius: 1.5,
		glowRadius: 4.0,
		glowOpacity: 0.35,
		enableParticles: true,
		particlesPerBlob: 3,
		viewBox: {
			margin: 33,
			size: 100,
		},
	},

	theme: {
		mode: 'system',
		preset: 'tinyland',
		cssPrefix: '--vector-',
		blendModeLight: 'multiply',
		blendModeDark: 'screen',
	},

	features: {
		deviceMotion: true,
		scrollPhysics: true,
		lazyLoad: true,
		webWorker: false,
		wasmAcceleration: false,
		debug: false,
	},
};

// ============================================================================
// THEME PRESETS
// ============================================================================

/**
 * Trans pride theme colors
 */
export const TRANS_THEME: ThemePreset = {
	name: 'trans',
	label: 'Trans Pride',
	hasVectors: true,
	blendModeLight: 'multiply',
	blendModeDark: 'screen',
	colors: [
		{ id: 'trans-blue', color: 'rgba(91, 206, 250, 0.60)', attractive: true, scrollAffinity: 0.8, layer: 'foreground' },
		{ id: 'trans-pink', color: 'rgba(245, 169, 184, 0.65)', attractive: true, scrollAffinity: 0.8, layer: 'foreground' },
		{ id: 'trans-white', color: 'rgba(242, 242, 245, 0.50)', attractive: false, scrollAffinity: 0.5, layer: 'mid' },
		{ id: 'trans-sky-blue', color: 'rgba(170, 225, 250, 0.55)', attractive: false, scrollAffinity: 0.6, layer: 'mid' },
		{ id: 'trans-powder-blue', color: 'rgba(160, 190, 255, 0.65)', attractive: true, scrollAffinity: 0.7, layer: 'foreground' },
		{ id: 'trans-rose-pink', color: 'rgba(250, 200, 210, 0.55)', attractive: false, scrollAffinity: 0.6, layer: 'mid' },
		{ id: 'trans-blush-pink', color: 'rgba(255, 160, 220, 0.65)', attractive: true, scrollAffinity: 0.7, layer: 'foreground' },
		{ id: 'trans-lavender', color: 'rgba(220, 220, 255, 0.55)', attractive: false, scrollAffinity: 0.5, layer: 'background' },
	],
};

/**
 * Rainbow pride theme colors
 */
export const PRIDE_THEME: ThemePreset = {
	name: 'pride',
	label: 'Pride Rainbow',
	hasVectors: true,
	blendModeLight: 'multiply',
	blendModeDark: 'screen',
	colors: [
		{ id: 'pride-red', color: 'rgba(228, 3, 3, 0.55)', attractive: true, scrollAffinity: 0.9, layer: 'foreground' },
		{ id: 'pride-orange', color: 'rgba(255, 140, 0, 0.55)', attractive: true, scrollAffinity: 0.8, layer: 'foreground' },
		{ id: 'pride-yellow', color: 'rgba(255, 237, 0, 0.55)', attractive: false, scrollAffinity: 0.7, layer: 'mid' },
		{ id: 'pride-green', color: 'rgba(0, 128, 38, 0.55)', attractive: true, scrollAffinity: 0.8, layer: 'foreground' },
		{ id: 'pride-blue', color: 'rgba(36, 64, 142, 0.55)', attractive: true, scrollAffinity: 0.9, layer: 'foreground' },
		{ id: 'pride-purple', color: 'rgba(115, 41, 130, 0.55)', attractive: true, scrollAffinity: 0.8, layer: 'foreground' },
	],
};

/**
 * Tinyland default theme colors
 */
export const TINYLAND_THEME: ThemePreset = {
	name: 'tinyland',
	label: 'Tinyland',
	hasVectors: true,
	blendModeLight: 'multiply',
	blendModeDark: 'screen',
	colors: [
		{ id: 'tinyland-purple', color: 'rgba(139, 92, 246, 0.55)', attractive: true, scrollAffinity: 0.8, layer: 'foreground' },
		{ id: 'tinyland-blue', color: 'rgba(59, 130, 246, 0.55)', attractive: true, scrollAffinity: 0.7, layer: 'foreground' },
		{ id: 'tinyland-pink', color: 'rgba(236, 72, 153, 0.50)', attractive: true, scrollAffinity: 0.8, layer: 'mid' },
		{ id: 'tinyland-white', color: 'rgba(242, 242, 245, 0.45)', attractive: false, scrollAffinity: 0.4, layer: 'background' },
	],
};

/**
 * High contrast theme (no vectors)
 */
export const HIGH_CONTRAST_THEME: ThemePreset = {
	name: 'high-contrast',
	label: 'High Contrast',
	hasVectors: false,
	blendModeLight: 'normal',
	blendModeDark: 'normal',
	colors: [],
};

/**
 * All available theme presets
 */
export const THEME_PRESETS: Record<ThemePresetName, ThemePreset> = {
	tinyland: TINYLAND_THEME,
	trans: TRANS_THEME,
	pride: PRIDE_THEME,
	'high-contrast': HIGH_CONTRAST_THEME,
	custom: {
		name: 'custom',
		label: 'Custom',
		hasVectors: true,
		blendModeLight: 'multiply',
		blendModeDark: 'screen',
		colors: [],
	},
};

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Deep partial type for configuration overrides
 */
export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Configuration override type
 */
export type TinyVectorsConfigOverride = DeepPartial<Omit<TinyVectorsConfig, 'version'>>;

/**
 * Merge default config with overrides
 */
export function mergeConfig(override: TinyVectorsConfigOverride): TinyVectorsConfig {
	return {
		version: '1.0.0',
		core: { ...DEFAULT_CONFIG.core, ...override.core },
		physics: { ...DEFAULT_CONFIG.physics, ...override.physics },
		rendering: {
			...DEFAULT_CONFIG.rendering,
			...override.rendering,
			viewBox: { ...DEFAULT_CONFIG.rendering.viewBox, ...override.rendering?.viewBox },
		},
		theme: { ...DEFAULT_CONFIG.theme, ...override.theme },
		features: { ...DEFAULT_CONFIG.features, ...override.features },
	};
}

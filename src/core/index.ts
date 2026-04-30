// Curated public surface for the /core entry point. All exports below
// were previously emitted via `export *` from types.js and schema.js;
// this file makes the surface explicit and tree-shake-friendly without
// changing it.

// — Physics core —
export { BlobPhysics, type BlobPhysicsConfig } from './BlobPhysics.js';

// — Path generation —
export {
	generateSmoothBlobPath,
	generateSmoothBlobPathSync,
	preInitPathGenerator,
} from './PathGenerator.js';

// — Spring system —
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

// — Spatial / kernel utilities —
export { GaussianKernel } from './GaussianKernel.js';
export { SpatialHash } from './SpatialHash.js';

// — Browser detection —
export { browser, isBrowser } from './browser.js';

// — Blob and motion types —
export type {
	ControlPoint,
	ControlPointVelocity,
	ConvexBlob,
	ColorDefinition,
	DeviceMotionData,
	GravityVector,
	TiltVector,
	PullForce,
} from './types.js';

// — Configuration types —
export type {
	TinyVectorsConfig,
	CoreConfig,
	PhysicsConfig,
	RenderingConfig,
	ThemeConfig,
	FeatureFlags,
	TinyVectorsConfigOverride,
	DeepPartial,
} from './schema.js';

// — Theme types —
export type {
	ThemePresetName,
	BlendMode,
	ThemeColor,
	ThemePreset,
} from './theme-presets.js';

// — Render blob shapes —
export type {
	BlobCore,
	RenderBlob,
	PhysicsBlob,
} from './schema.js';

// — Input event types —
export type {
	ScrollData,
	PointerData,
} from './schema.js';

// — Custom event types —
export type {
	TinyVectorsEventType,
	TinyVectorsEventHandler,
	TinyVectorsEvent,
	FrameEventData,
	ThemeChangeEventData,
} from './schema.js';

// — Theme presets and config —
export {
	TRANS_THEME,
	PRIDE_THEME,
	TINYLAND_THEME,
	HIGH_CONTRAST_THEME,
	THEME_PRESETS,
} from './theme-presets.js';
export { THEME_PRESET_COLORS } from './theme-colors.js';

export {
	DEFAULT_CONFIG,
	mergeConfig,
} from './schema.js';

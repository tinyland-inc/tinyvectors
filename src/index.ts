// Curated public package root. Keep this explicit so the npm surface stays
// reviewable and tree-shake-friendly.

export {
	BlobPhysics,
	generateSmoothBlobPath,
	generateSmoothBlobPathSync,
	preInitPathGenerator,
	SpringSystem,
	DEFAULT_SPRING_CONFIG,
	computePolygonArea,
	computeCircularity,
	enforceAreaConservation,
	createControlPointVelocities,
	GaussianKernel,
	SpatialHash,
	browser,
	isBrowser,
	TRANS_THEME,
	PRIDE_THEME,
	TINYLAND_THEME,
	HIGH_CONTRAST_THEME,
	THEME_PRESETS,
	THEME_PRESET_COLORS,
	DEFAULT_CONFIG,
	mergeConfig,
} from './core/index.js';

export type {
	BlobPhysicsConfig,
	SpringConfig,
	GelControlPoint,
	ControlPoint,
	ControlPointVelocity,
	ConvexBlob,
	ColorDefinition,
	DeviceMotionData,
	GravityVector,
	TiltVector,
	TinyVectorsConfig,
	CoreConfig,
	PhysicsConfig,
	RenderingConfig,
	ThemeConfig,
	FeatureFlags,
	TinyVectorsConfigOverride,
	DeepPartial,
	ThemePresetName,
	BlendMode,
	ThemeColor,
	ThemePreset,
	BlobCore,
	RenderBlob,
	PhysicsBlob,
	ScrollData,
	PointerData,
	TinyVectorsEventType,
	TinyVectorsEventHandler,
	TinyVectorsEvent,
	FrameEventData,
	ThemeChangeEventData,
} from './core/index.js';

export {
	DeviceMotion,
	mapClientPointToPhysics,
	createPointerPhysicsController,
	getLatestPointerEvent,
	ScrollHandler,
} from './motion/index.js';

export type {
	DeviceMotionCallback,
	DeviceMotionOptions,
	DeviceMotionPermissionState,
	MotionVector,
	PhysicsPoint,
	PhysicsRange,
	PointerBounds,
	PointerLikeEvent,
	PointerMoveEventName,
	PointerPhysicsController,
	PointerPhysicsControllerOptions,
	PointerPhysicsEventTarget,
	ScrollHandlerConfig,
	PullForce,
} from './motion/index.js';

export {
	getThemePreset,
	generateThemeCSS,
	isDarkMode,
	watchDarkMode,
} from './themes/index.js';

export {
	TinyVectors,
	BlobSVG,
} from './svelte/index.js';

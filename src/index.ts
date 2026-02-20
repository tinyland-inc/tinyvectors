/**
 * TinyVectors - Animated vector blob backgrounds
 * @packageDocumentation
 */

// Core exports
export * from './core/index.js';

// Motion exports
export * from './motion/index.js';

// Theme exports
export * from './themes/index.js';

// Svelte component exports
export * from './svelte/index.js';

// Re-export commonly used types at top level
export type {
	TinyVectorsConfig,
	CoreConfig,
	PhysicsConfig,
	RenderingConfig,
	ThemeConfig,
	FeatureFlags,
	RenderBlob,
	ThemeColor,
	ThemePreset,
	ThemePresetName,
} from './core/schema.js';

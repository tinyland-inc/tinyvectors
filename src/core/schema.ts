







import type { ControlPoint, ControlPointVelocity, DeviceMotionData } from './types.js';








export interface TinyVectorsConfig {
	
	version: '1.0.0';

	
	core: CoreConfig;

	
	physics: PhysicsConfig;

	
	rendering: RenderingConfig;

	
	theme: ThemeConfig;

	
	features: FeatureFlags;
}




export interface CoreConfig {
	
	blobCount: number;

	
	minRadius: number;

	
	maxRadius: number;

	
	fps: number;

	
	animated: boolean;

	
	startDelay: number;
}




export interface PhysicsConfig {
	
	viscosity: number;

	
	bounceDamping: number;

	
	deformationSpeed: number;

	
	territoryStrength: number;

	
	antiClusteringStrength: number;

	
	maxVelocity: number;

	
	gravity: number;
}




export interface RenderingConfig {
	
	layers: 3 | 4;

	
	blurRadius: number;

	
	glowRadius: number;

	
	glowOpacity: number;

	
	enableParticles: boolean;

	
	particlesPerBlob: number;

	
	viewBox: {
		
		margin: number;
		
		size: number;
	};
}




export interface ThemeConfig {
	
	mode: 'light' | 'dark' | 'system';

	
	preset: ThemePresetName;

	
	colors?: ThemeColor[];

	
	cssPrefix: string;

	
	blendModeLight: BlendMode;

	
	blendModeDark: BlendMode;
}




export interface FeatureFlags {
	
	deviceMotion: boolean;

	
	scrollPhysics: boolean;

	
	lazyLoad: boolean;

	
	webWorker: boolean;

	
	wasmAcceleration: boolean;

	
	debug: boolean;
}






export type ThemePresetName = 'tinyland' | 'trans' | 'pride' | 'high-contrast' | 'custom';


export type BlendMode = 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'normal';




export interface ThemeColor {
	
	id: string;

	
	color: string;

	
	attractive: boolean;

	
	scrollAffinity: number;

	
	layer: 'background' | 'mid' | 'foreground';
}




export interface ThemePreset {
	
	name: ThemePresetName;

	
	label: string;

	
	colors: ThemeColor[];

	
	blendModeLight: BlendMode;

	
	blendModeDark: BlendMode;

	
	hasVectors: boolean;
}








export interface BlobCore {
	
	id: number;

	
	x: number;

	
	y: number;

	
	vx: number;

	
	vy: number;

	
	radius: number;

	
	color: string;
}




export interface RenderBlob extends BlobCore {
	
	baseX: number;

	
	baseY: number;

	
	currentX: number;

	
	currentY: number;

	
	size: number;

	
	phase: number;

	
	speed: number;

	
	gradientId: string;

	
	intensity: number;

	
	stickiness: number;

	
	elasticity: number;
	viscosity: number;
	fluidMass: number;

	
	scrollAffinity: number;
	isAttractive: boolean;

	
	mouseDistance: number;
	isStuck: boolean;

	
	radiusVariations: number[];
}





export interface PhysicsBlob extends RenderBlob {
	
	surfaceTension?: number;

	
	density?: number;

	
	flowResistance?: number;

	
	controlPoints?: ControlPoint[];

	
	controlVelocities?: ControlPointVelocity[];

	
	deformationStrength?: number;

	
	cohesion?: number;

	
	stretchability?: number;

	
	territoryRadius?: number;
	territoryX?: number;
	territoryY?: number;

	
	personalSpace?: number;
	repulsionStrength?: number;
}


export type { ControlPoint, ControlPointVelocity, DeviceMotionData };




export interface ScrollData {
	
	y: number;

	
	velocity: number;

	
	direction: 'up' | 'down' | 'idle';

	
	peakVelocity?: number;

	
	totalDistance?: number;
}




export interface PointerData {
	
	x: number;

	
	y: number;

	
	active: boolean;

	
	vx?: number;

	
	vy?: number;
}








export type TinyVectorsEventType =
	| 'init'
	| 'frame'
	| 'themeChange'
	| 'modeChange'
	| 'resize'
	| 'collision'
	| 'dispose';




export type TinyVectorsEventHandler<T = unknown> = (event: TinyVectorsEvent<T>) => void;




export interface TinyVectorsEvent<T = unknown> {
	
	type: TinyVectorsEventType;

	
	timestamp: number;

	
	data: T;
}




export interface FrameEventData {
	
	deltaTime: number;

	
	frame: number;

	
	fps: number;

	
	blobs: RenderBlob[];
}




export interface ThemeChangeEventData {
	
	from: ThemePresetName;

	
	to: ThemePresetName;

	
	mode: 'light' | 'dark';
}








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




export const HIGH_CONTRAST_THEME: ThemePreset = {
	name: 'high-contrast',
	label: 'High Contrast',
	hasVectors: false,
	blendModeLight: 'normal',
	blendModeDark: 'normal',
	colors: [],
};




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








export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};




export type TinyVectorsConfigOverride = DeepPartial<Omit<TinyVectorsConfig, 'version'>>;




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

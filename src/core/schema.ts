







import type { ControlPoint, ControlPointVelocity, DeviceMotionData } from './types.js';
import type {
	BlendMode,
	ThemeColor,
	ThemePresetName,
} from './theme-presets.js';
export type {
	BlendMode,
	ThemeColor,
	ThemePreset,
	ThemePresetName,
} from './theme-presets.js';








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








export {
	HIGH_CONTRAST_THEME,
	PRIDE_THEME,
	THEME_PRESETS,
	TINYLAND_THEME,
	TRANS_THEME,
} from './theme-presets.js';
export { THEME_PRESET_COLORS } from './theme-colors.js';








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

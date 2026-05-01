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

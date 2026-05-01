import type { ThemePresetName } from './theme-presets.js';

export const THEME_PRESET_COLORS: Record<ThemePresetName, string[]> = {
	tinyland: [
		'rgba(139,92,246,.55)',
		'rgba(59,130,246,.55)',
		'rgba(236,72,153,.50)',
		'rgba(242,242,245,.45)',
	],
	trans: [
		'rgba(91,206,250,.60)',
		'rgba(245,169,184,.65)',
		'rgba(242,242,245,.50)',
		'rgba(170,225,250,.55)',
		'rgba(160,190,255,.65)',
		'rgba(250,200,210,.55)',
		'rgba(255,160,220,.65)',
		'rgba(220,220,255,.55)',
	],
	pride: [
		'rgba(228,3,3,.55)',
		'rgba(255,140,0,.55)',
		'rgba(255,237,0,.55)',
		'rgba(0,128,38,.55)',
		'rgba(36,64,142,.55)',
		'rgba(115,41,130,.55)',
	],
	'high-contrast': [],
	custom: [],
};

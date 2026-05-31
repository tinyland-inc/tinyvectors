



import {
	THEME_PRESETS,
	type ThemePreset,
	type ThemePresetName,
} from '../core/theme-presets.js';

export {
	THEME_PRESETS,
	TRANS_THEME,
	PRIDE_THEME,
	TINYLAND_THEME,
	HIGH_CONTRAST_THEME,
	type ThemePreset,
	type ThemeColor,
	type ThemePresetName,
} from '../core/theme-presets.js';




export function getThemePreset(name: string): ThemePreset | undefined {
	return THEME_PRESETS[name as keyof typeof THEME_PRESETS];
}

// Theme catalog — the package-curated set of presets with derived preview/
// vector color swatches. Hub/spoke consumers (e.g. @tummycrypt/tinyland-stores
// themeStore) render this catalog; keeping it here makes the package the
// single source of truth for which themes ship and how they preview.
export type PackageThemeName = Exclude<ThemePresetName, 'custom'>;

export interface ThemeCatalogEntry {
	name: PackageThemeName;
	label: string;
	description: string;
	hasVectors: boolean;
	colors: string[];
	previewColors: string[];
	vectorColors: string[];
	source: 'tinyvectors';
}

const PACKAGE_THEME_ORDER = [
	'tinyland',
	'trans',
	'pride',
	'high-contrast',
] as const satisfies readonly PackageThemeName[];

const THEME_DESCRIPTIONS: Record<PackageThemeName, string> = {
	tinyland: 'Soft violet, blue, and pink glow',
	trans: 'Soft trans pride palette',
	pride: 'Rainbow signal colors with diffuse vectors',
	'high-contrast': 'WCAG AAA compliant for maximum readability',
};

const THEME_PREVIEW_OVERRIDES: Partial<Record<PackageThemeName, string[]>> = {
	'high-contrast': ['#000000', '#FFFFFF', '#0040FF'],
};

function getThemePalette(name: string, count?: number): string[] {
	const preset = getThemePreset(name);
	if (!preset?.hasVectors) return [];

	const colors = preset.colors.map((entry) => entry.color);
	return count === undefined ? colors : colors.slice(0, count);
}

export function getThemePreviewColors(name: string, count = 3): string[] {
	return getThemePalette(name, count);
}

export function getThemeVectorColors(name: string, count = 5): string[] {
	return getThemePalette(name, count);
}

export function getThemeCatalogEntry(
	name: PackageThemeName,
): ThemeCatalogEntry | undefined {
	const preset = getThemePreset(name);
	if (!preset) return undefined;

	const previewColors =
		THEME_PREVIEW_OVERRIDES[name] ?? getThemePreviewColors(name);

	return {
		name,
		label: preset.label,
		description: THEME_DESCRIPTIONS[name],
		hasVectors: preset.hasVectors,
		colors: previewColors,
		previewColors,
		vectorColors: getThemeVectorColors(name),
		source: 'tinyvectors',
	};
}

export function getThemeCatalog(): ThemeCatalogEntry[] {
	return PACKAGE_THEME_ORDER.map((name) => getThemeCatalogEntry(name)).filter(
		(theme): theme is ThemeCatalogEntry => theme !== undefined,
	);
}




export function generateThemeCSS(
	theme: ThemePreset,
	prefix = '--vector-'
): string {
	const lines: string[] = [':root {'];

	for (const color of theme.colors) {
		lines.push(`  ${prefix}${color.id}: ${color.color};`);
	}

	lines.push('}');
	return lines.join('\n');
}




export function isDarkMode(): boolean {
	if (typeof document === 'undefined') return false;
	return document.documentElement.classList.contains('dark');
}




export function watchDarkMode(callback: (isDark: boolean) => void): () => void {
	if (typeof document === 'undefined') return () => {};

	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.attributeName === 'class') {
				callback(document.documentElement.classList.contains('dark'));
			}
		}
	});

	observer.observe(document.documentElement, { attributes: true });

	
	callback(document.documentElement.classList.contains('dark'));

	return () => observer.disconnect();
}

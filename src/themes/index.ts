/**
 * Themes module - Color presets and CSS generation
 */

import { THEME_PRESETS, type ThemePreset } from '../core/schema.js';

export {
	THEME_PRESETS,
	TRANS_THEME,
	PRIDE_THEME,
	TINYLAND_THEME,
	HIGH_CONTRAST_THEME,
	type ThemePreset,
	type ThemeColor,
	type ThemePresetName,
} from '../core/schema.js';

/**
 * Get theme preset by name
 */
export function getThemePreset(name: string): ThemePreset | undefined {
	return THEME_PRESETS[name as keyof typeof THEME_PRESETS];
}

/**
 * Generate CSS custom properties for a theme
 */
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

/**
 * Check if current mode is dark
 */
export function isDarkMode(): boolean {
	if (typeof document === 'undefined') return false;
	return document.documentElement.classList.contains('dark');
}

/**
 * Watch for dark mode changes
 */
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

	// Call immediately with current state
	callback(document.documentElement.classList.contains('dark'));

	return () => observer.disconnect();
}

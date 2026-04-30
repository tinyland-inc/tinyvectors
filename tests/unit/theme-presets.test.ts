import { describe, expect, it } from 'vitest';

import {
	THEME_PRESETS,
	type ThemePresetName,
} from '../../src/core/theme-presets.js';
import { THEME_PRESET_COLORS } from '../../src/core/theme-colors.js';
import {
	THEME_PRESET_COLORS as SCHEMA_THEME_PRESET_COLORS,
	THEME_PRESETS as SCHEMA_THEME_PRESETS,
} from '../../src/core/schema.js';

describe('theme presets', () => {
	it('keeps lightweight color presets aligned with full theme presets', () => {
		const names = Object.keys(THEME_PRESETS) as ThemePresetName[];

		expect(Object.keys(THEME_PRESET_COLORS).sort()).toEqual([...names].sort());

		for (const name of names) {
			expect(THEME_PRESET_COLORS[name]).toEqual(
				THEME_PRESETS[name].colors.map((color) => compactRgba(color.color)),
			);
		}
	});

	it('preserves schema re-exports for the existing public surface', () => {
		expect(SCHEMA_THEME_PRESETS).toBe(THEME_PRESETS);
		expect(SCHEMA_THEME_PRESET_COLORS).toBe(THEME_PRESET_COLORS);
	});
});

function compactRgba(color: string): string {
	return color.replaceAll(' ', '').replace(',0.', ',.');
}

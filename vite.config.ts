import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
	plugins: [
		svelte({
			compilerOptions: {
				// Generate runes-mode components
				runes: true,
			},
		}),
	],

	build: {
		lib: {
			entry: {
				index: resolve(__dirname, 'src/index.ts'),
				'core/index': resolve(__dirname, 'src/core/index.ts'),
				'motion/index': resolve(__dirname, 'src/motion/index.ts'),
				'themes/index': resolve(__dirname, 'src/themes/index.ts'),
				'svelte/index': resolve(__dirname, 'src/svelte/index.ts'),
			},
			formats: ['es'],
		},

		rollupOptions: {
			external: [/^svelte($|\/)/],
			output: {
				preserveModules: true,
				preserveModulesRoot: 'src',
				entryFileNames: '[name].js',
				assetFileNames: '[name][extname]',
			},
			treeshake: {
				moduleSideEffects: false,
				propertyReadSideEffects: false,
			},
		},

		// Generate sourcemaps for debugging
		sourcemap: true,

		// Ensure clean output
		emptyOutDir: true,

		// Target modern browsers
		target: 'es2022',

		// Minify for production
		minify: 'esbuild',
	},

	// Resolve aliases for cleaner imports
	resolve: {
		alias: {
			$lib: resolve(__dirname, 'src'),
		},
	},
});

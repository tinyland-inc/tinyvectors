import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
	plugins: [
		svelte({
			compilerOptions: {
				
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

		
		sourcemap: true,

		
		emptyOutDir: true,

		
		target: 'es2022',

		
		minify: 'esbuild',
	},

	
	resolve: {
		alias: {
			$lib: resolve(__dirname, 'src'),
		},
	},
});

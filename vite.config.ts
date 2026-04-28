import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

function outputFileName(chunkName: string): string {
	const withoutSvelte = chunkName.replace(/\.svelte$/, '');
	const srcIndex = withoutSvelte.lastIndexOf('/src/');
	const packageRelative =
		srcIndex >= 0 ? withoutSvelte.slice(srcIndex + '/src/'.length) : withoutSvelte.replace(/^src\//, '');

	return `${packageRelative.replace(/^\/+/, '')}.js`;
}

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
				// Strip .svelte from compiled output filenames to prevent
				// downstream vite-plugin-svelte from re-processing them.
				// BlobSVG.svelte → BlobSVG.js (not BlobSVG.svelte.js)
				entryFileNames: (chunkInfo) => outputFileName(chunkInfo.name),
				chunkFileNames: (chunkInfo) => outputFileName(chunkInfo.name),
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

		
		// Don't minify — library consumers handle minification.
		// esbuild minification uses `$` as a variable name which conflicts
		// with Svelte's reserved `$` prefix in downstream builds.
		minify: false,
	},

	
	resolve: {
		alias: {
			$lib: resolve(__dirname, 'src'),
		},
	},
});

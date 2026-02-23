import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
	root: resolve(__dirname, 'dev'),

	plugins: [
		svelte({
			compilerOptions: {
				runes: true,
			},
		}),
	],

	resolve: {
		alias: {
			$lib: resolve(__dirname, 'src'),
		},
	},

	server: {
		port: 5175,
		open: true,
		hmr: {
			port: 24679, 
		},
	},
});

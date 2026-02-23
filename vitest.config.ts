import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	root: __dirname,
	test: {
		name: 'tinyvectors',
		root: __dirname,
		include: ['tests/**/*.test.ts'],
		exclude: ['**/node_modules/**', '**/dist/**'],
		environment: 'node',
		globals: true,
		testTimeout: 30000, 
		pool: 'forks',
		isolate: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			reportsDirectory: './coverage',
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.svelte', 'src/**/*.d.ts'],
			thresholds: {
				statements: 70,
				branches: 65,
				functions: 70,
				lines: 70,
			},
		},
	},
	resolve: {
		alias: {
			'$lib': resolve(__dirname, './src'),
		},
	},
});

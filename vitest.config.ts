import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts'],
		exclude: ['**/node_modules/**', '**/dist/**'],
		environment: 'node',
		globals: true,
		testTimeout: 30000, // PBT tests may need more time
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.svelte', 'src/**/*.d.ts'],
		},
	},
	resolve: {
		alias: {
			'$lib': '/src',
		},
	},
});

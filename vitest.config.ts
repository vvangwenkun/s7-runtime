import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['**/__tests__/**/*.spec.ts'],
		exclude: ['**/node_modules/**', '**/dist/**', '**/examples/**'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'**/node_modules/**',
				'**/dist/**',
				'**/examples/**',
				'**/*.d.ts',
			],
		},
		pool: 'threads',
		testTimeout: 10000,
	},
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['test/**/*.spec.ts'],
	},
});

// Note: runs are preceded by a wall of "Sourcemap for ... points to missing
// source files" warnings. Those come from Node's source map support reading
// the maps that n8n-workflow publishes without their sources - nothing in
// this package causes them and nothing here can switch them off. Ignore them;
// the test result is on the last lines.

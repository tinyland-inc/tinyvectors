import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tscPath = require.resolve('typescript/lib/tsc.js');
const result = spawnSync(process.execPath, [tscPath, '-p', 'tsconfig.declarations.json'], {
	stdio: 'inherit',
});

if (result.status !== 0) {
	process.exit(result.status ?? 1);
}

await import('./copy-svelte-declarations.mjs');

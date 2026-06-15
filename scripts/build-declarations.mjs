import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const packageRoot = new URL('../', import.meta.url);
const declarationsConfig = new URL('../tsconfig.declarations.json', import.meta.url);
const tscPath = require.resolve('typescript/lib/tsc.js');
const result = spawnSync(process.execPath, [tscPath, '-p', declarationsConfig.pathname], {
	cwd: packageRoot,
	stdio: 'inherit',
});

if (result.status !== 0) {
	process.exit(result.status ?? 1);
}

await import('./copy-svelte-declarations.mjs');

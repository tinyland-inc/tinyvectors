import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// CWD-independent vite build (same pattern as build-declarations.mjs):
// js_run_binary runs tools with cwd=$(BINDIR). When this package builds as an
// external Bazel module, the package root is $(BINDIR)/external/<repo>+/, so a
// bare `vite build` resolves root/outDir against the consumer's BINDIR and the
// declared dist/ TreeArtifact ships empty. Anchor cwd to the package root so
// vite.config.ts discovery, root, and outDir land in the right place in both
// main-repo and external-module contexts.
const require = createRequire(import.meta.url);
const packageRoot = fileURLToPath(new URL('../', import.meta.url));

// vite does not expose ./bin/vite.js through its "exports" map; resolve the
// bin through package.json like the downstream consumers do.
const vitePackageJson = require.resolve('vite/package.json');
const viteManifest = JSON.parse(readFileSync(vitePackageJson, 'utf8'));
const viteBinRelative =
	typeof viteManifest.bin === 'string' ? viteManifest.bin : viteManifest.bin.vite;
const viteBin = join(dirname(vitePackageJson), viteBinRelative);

const result = spawnSync(process.execPath, [viteBin, 'build'], {
	cwd: packageRoot,
	stdio: 'inherit',
});

if (result.status !== 0) {
	process.exit(result.status ?? 1);
}

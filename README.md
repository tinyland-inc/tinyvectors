# `@tummycrypt/tinyvectors`

Animated vector blob backgrounds with lil physics for Svelte 5.

This package is what powers the moving background layer on `transscendsurvival.org`, but it is meant to be useful outside that site too. It ships a small set of Svelte components plus the lower-level motion, theme, and core utilities that drive them.

## Install

```bash
pnpm add @tummycrypt/tinyvectors
```

Peer dependency:

- `svelte@^5`

## Quick Start

```svelte
<script lang="ts">
	import { TinyVectors } from '@tummycrypt/tinyvectors';

	const colors = [
		'rgba(26,188,156,0.35)',
		'rgba(22,160,133,0.30)',
		'rgba(39,174,96,0.25)',
		'rgba(52,152,219,0.20)',
	];
</script>

<div class="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true">
	<TinyVectors
		theme="custom"
		colors={colors}
		blobCount={5}
		opacity={0.4}
		enableScrollPhysics={true}
		enableDeviceMotion={false}
	/>
</div>
```

## Entry Points

The package exports these public entry points:

- `@tummycrypt/tinyvectors`
- `@tummycrypt/tinyvectors/core`
- `@tummycrypt/tinyvectors/motion`
- `@tummycrypt/tinyvectors/themes`
- `@tummycrypt/tinyvectors/themes/css`
- `@tummycrypt/tinyvectors/svelte`

Use the top-level entry point when you just want the packaged component surface. Reach for the lower-level paths if you are composing your own vector layer, motion handling, or theme primitives.

## Local Development

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```

Useful extra commands:

- `pnpm dev` runs the local Vite demo app
- `pnpm dev:watch` rebuilds the library on change
- `pnpm test:pbt` runs the property-based invariants only
- `pnpm check:release-metadata` verifies `package.json`, `BUILD.bazel`, and `MODULE.bazel` stay aligned
- `pnpm check:package` runs `publint`

## Release Truth

The supported consumer path today is the published npm package.

This repo also carries Bazel metadata because the broader package ecosystem around it uses Bazel package targets and registry generation. That standalone Bazel surface is being tightened up, but the release metadata in this repo is expected to stay aligned with the published package either way.

## License

This repository is distributed under the zlib/libpng license. See [LICENSE](./LICENSE).

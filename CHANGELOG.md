# Changelog

## 0.3.5 - 2026-07-25

- Fixes hermetic Bazel/RBE builds (TIN-2099): `npm_translate_lock` now sets `lifecycle_hooks = {"esbuild": []}` so rules_js no longer runs esbuild's `node install.js` postinstall as a build action, which failed under strict sandbox/worker strategies (network blocked, platform package absent from inputs). Safe because vite drives esbuild through its JS API, whose bin-path resolution falls back to `require.resolve('@esbuild/<platform>/bin/esbuild')` at runtime, and `pnpm-lock.yaml` pins every `@esbuild/*` platform package.
- Multi-signal dark detection: `isDarkMode()`/`watchDarkMode()` and `BlobSVG`'s blend switch now recognize a `.dark` root class, Skeleton v4's `data-mode="dark"` attribute, or a `color-scheme: dark` computed on the root element; `watchDarkMode()` observes both `class` and `data-mode` mutations and `prefers-color-scheme` changes. Previously the dark blend never engaged on Skeleton v4 consumers, which signal dark via `data-mode="dark"`, not a `.dark` class. Existing `.dark`-class consumers are unchanged.
- Adds an `isDark?: boolean | null` prop (default `null` = auto-detect) to `TinyVectors` and `BlobSVG`; a boolean overrides detection entirely. Adds the `resolveDark()` helper to the themes surface.
- `themes/css` (`vector-colors.css`): dark overrides now also match `[data-mode='dark']`, corrects the header comment that claimed Skeleton toggles a `.dark` class, and ships a `--tv-blend` seam (`multiply` in light, `screen` in dark) under both selector families.

## 0.3.4 - 2026-07-05

- Fixes the root `"."` export's `svelte` condition to point at the full root barrel (`./dist/index.js`) instead of the components-only `./dist/svelte/index.js`. The two conditions exposed divergent API surfaces on the same specifier: bundlers resolving with the `svelte` condition (Vite consumers) could not see root-barrel exports like `getThemeCatalog`, breaking `@tummycrypt/tinyland-stores`' theme catalog import in consumer graphs. The root barrel is a strict superset (it re-exports `TinyVectors`/`BlobSVG`), and components ship pre-compiled `.js`, so no raw-svelte resolution is lost. The `./svelte` subpath is unchanged.

## 0.3.3 - 2026-07-05

- Makes the Bazel vite build CWD-independent (same pattern as the 0.3.2 build-declarations fix): `tinyvectors_build` now runs through `scripts/build-vite.mjs`, which anchors cwd to the package root so `dist/` materializes correctly when the package builds as an external Bazel module (previously the declared `dist/` TreeArtifact shipped empty in consumer graphs, breaking SSR imports of `@tummycrypt/tinyvectors`).

## 0.3.2 - 2026-06-15

- Makes the Bazel declarations build CWD-independent: `tinyvectors_declarations` runs through `scripts/build-declarations.mjs`, which anchors cwd to the package root so `dist-types/` materializes correctly when the package builds as an external Bazel module.

## 0.3.1 - 2026-05-31

- Adds `getThemeCatalog()` and `getThemeCatalogEntry()` (with `getThemePreviewColors()`/`getThemeVectorColors()`) so the package is the single source of truth for which themes ship and how they preview; hub/spoke consumers such as `@tummycrypt/tinyland-stores` render this catalog (TIN-1746).
- CI: moves the package lane to a repo-owned runner and onto the Node 24 reusable package workflow.

## 0.3.0 - 2026-05-01

- Restores the pre-Phase-A gel/blob feel while keeping gravity-led motion, ambient movement, and safer smoothing.
- Adds device-motion status, permission, calibration, idle reset, reduced-motion, and Chrome/CDP browser harness coverage.
- Adds pointer and scroll lifecycle cleanup, stale IO reset behavior, pointer velocity coverage, and a conservative local pointer field.
- Hardens the package release surface with explicit exports, Bazel-built package validation, bundle-size checks, and consumer-package checks.
- Keeps the release bundle under the 12 KiB gzip gate while documenting the remaining 11 KiB target pressure.

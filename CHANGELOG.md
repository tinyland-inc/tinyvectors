# Changelog

## 0.3.4 - 2026-07-05

- Fixes the root `"."` export's `svelte` condition to point at the full root barrel (`./dist/index.js`) instead of the components-only `./dist/svelte/index.js`. The two conditions exposed divergent API surfaces on the same specifier: bundlers resolving with the `svelte` condition (Vite consumers) could not see root-barrel exports like `getThemeCatalog`, breaking `@tummycrypt/tinyland-stores`' theme catalog import in consumer graphs. The root barrel is a strict superset (it re-exports `TinyVectors`/`BlobSVG`), and components ship pre-compiled `.js`, so no raw-svelte resolution is lost. The `./svelte` subpath is unchanged.

## 0.3.3 - 2026-07-05

- Makes the Bazel vite build CWD-independent (same pattern as the 0.3.2 build-declarations fix): `tinyvectors_build` now runs through `scripts/build-vite.mjs`, which anchors cwd to the package root so `dist/` materializes correctly when the package builds as an external Bazel module (previously the declared `dist/` TreeArtifact shipped empty in consumer graphs, breaking SSR imports of `@tummycrypt/tinyvectors`).

## 0.3.0 - 2026-05-01

- Restores the pre-Phase-A gel/blob feel while keeping gravity-led motion, ambient movement, and safer smoothing.
- Adds device-motion status, permission, calibration, idle reset, reduced-motion, and Chrome/CDP browser harness coverage.
- Adds pointer and scroll lifecycle cleanup, stale IO reset behavior, pointer velocity coverage, and a conservative local pointer field.
- Hardens the package release surface with explicit exports, Bazel-built package validation, bundle-size checks, and consumer-package checks.
- Keeps the release bundle under the 12 KiB gzip gate while documenting the remaining 11 KiB target pressure.

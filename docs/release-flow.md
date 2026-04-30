# Release Flow

This repo publishes the npm package as the primary consumer artifact. Bazel exists here to produce and validate the same package shape used by downstream Bazel consumers.

## Authority Chain

1. `package.json` is the npm package authority for name, version, entry points, package manager, and publish config.
2. `MODULE.bazel` mirrors the package version for Bzlmod consumers.
3. `BUILD.bazel` builds the runtime package with Vite, emits declarations with `tsc`, and assembles `//:pkg` with `npm_package`.
4. `.bazelversion` pins the Bazel runtime. Local Nix exposes `bazel` through Bazelisk so the dev shell follows that pin.
5. `.github/workflows/ci.yml` and `.github/workflows/publish.yml` call the same pinned reusable package workflow.

`pnpm run check:release-metadata` verifies these surfaces stay aligned before CI, Bazel, or npm publish steps run.

## Local Verification

Run the CI checks plus the local consumer check for the Bazel-built package:

```bash
pnpm run check:release-metadata
pnpm run check
pnpm run test
pnpm run build
pnpm run check:package
pnpm run check:bundle-size
nix develop . --command bazel build //:pkg //:package_consumer_check //:bundle_size_check //:typecheck //:test --verbose_failures
pnpm run check:package-consumer
npm pack --dry-run ./bazel-bin/pkg
npm publish --dry-run --ignore-scripts --access public ./bazel-bin/pkg
```

`//:package_consumer_check` and `pnpm run check:package-consumer` both validate the Bazel-built package as an installed consumer would. The pnpm command expects `./bazel-bin/pkg` to exist. It links that package into a temporary consumer workspace with the Svelte peer dependency, verifies runtime subpath exports, and runs TypeScript against the packaged declarations.

`pnpm run check:bundle-size` measures a realistic tree-shaken consumer import, `import { TinyVectors } from '@tummycrypt/tinyvectors'`, with Svelte externalized as a peer dependency. `//:bundle_size_check` runs the same measurement against the Bazel-built package artifact. The current gate is 12 KiB gzip and the target remains 11 KiB gzip, so the check reports target headroom or overage while leaving a small CI buffer.

The bundle-size check also asserts that internal future-work modules stay out of that consumer bundle. For example, `dist/core/InteractionField.js` is allowed to ship as an internal preserved module, but it must not be pulled into the `{ TinyVectors }` bundle until runtime physics actually imports it.

`bazel query //...` should also work locally. `.bazelignore` excludes direnv, Nix, package-manager, and build-output directories so Bazel does not walk generated local artifacts.

## Compatibility Notes

The v0.3 branch currently keeps the renderer-private `--tv-blob-intensity` custom property used by the restored three-layer renderer. Do not document a migration to `--tvi`; that abbreviation was part of the reverted gel-rendering rewrite.

## CI Flow

Pull requests and pushes to `main` run `Verify`, which calls `tinyland-inc/ci-templates/.github/workflows/js-bazel-package.yml` at a pinned commit. The reusable workflow:

- installs the configured pnpm and Node major;
- runs metadata, typecheck, test, build, package, and bundle-size checks;
- builds `//:pkg //:package_consumer_check //:bundle_size_check //:typecheck //:test` through Bazelisk;
- validates the Bazel-built package with `npm pack --dry-run`;
- validates npm publication with `npm publish --dry-run --ignore-scripts`.

This means CI treats the Bazel package output as the release candidate, not the local `dist/` directory alone.

## Publish Flow

Tags matching `v*` run `Publish to npm`. The publish workflow reuses the same package workflow with `dry_run: false`, downloads the Bazel-built package artifact, and publishes that isolated artifact to npm.

The workflow has `id-token: write` because npm provenance and trusted publishing both depend on OIDC-capable CI. The current reusable template still accepts `NPM_TOKEN`; moving fully to npm trusted publishing should happen in the shared template, not only in this repo.

## FlakeHub Status

The flake is currently a development environment only. It does not publish TinyVectors to FlakeHub and does not expose package outputs.

If FlakeHub publication becomes useful, add it as a separate release surface with its own workflow and metadata checks. FlakeHub publication should use its trusted-platform publishing model rather than ad hoc local publishing.

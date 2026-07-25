# Release Flow

This repo releases through signed git tags and the
[tinyland-inc/bazel-registry](https://github.com/tinyland-inc/bazel-registry)
graph. The npm channel is retired (2026-07-25): registry.npmjs.org stops at
0.3.0 and receives no further publishes. Bazel exists here to produce and
validate the package shape that downstream consumers resolve through the
registry or build from the tag archive.

## Authority Chain

1. `package.json` is the metadata authority for name, version, entry points,
   package manager, and engines. Every other surface is checked against it.
2. `MODULE.bazel` mirrors the package version for Bzlmod consumers
   (`tummycrypt_tinyvectors`).
3. `BUILD.bazel` builds the runtime package with Vite, emits declarations with
   `tsc`, and assembles `//:pkg` with `npm_package`.
4. `.bazelversion` pins the Bazel runtime. Local Nix exposes `bazel` through
   Bazelisk so the dev shell follows that pin.
5. `.github/workflows/ci.yml` and `.github/workflows/publish.yml` call the same
   pinned reusable package workflow with `npm_publish_mode: disabled`.
6. The signed git tag `vX.Y.Z` on the release merge commit is the release
   artifact: its GitHub tag archive is what consumers pin and build.
7. The bazel-registry entry for that version is the publication step. There is
   no npm publish in the chain.

`pnpm run check:release-metadata` verifies these surfaces stay aligned before
CI or Bazel steps run. It pins, among other things, the version/name agreement
across `package.json`, `MODULE.bazel`, and `BUILD.bazel`; the pnpm and Node
pins; the identical pinned reusable-workflow commit in both workflows; the
shared workflow inputs, including `publish_mode: hosted_exception` and
`npm_publish_mode: disabled`; and `dry_run: true` on CI versus
`dry_run: false` on tags.

## Pre-Release Gates

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
```

`//:package_consumer_check` and `pnpm run check:package-consumer` both validate
the Bazel-built package as an installed consumer would. The pnpm command
expects `./bazel-bin/pkg` to exist. It links that package into a temporary
consumer workspace with the Svelte peer dependency, verifies runtime subpath
exports, and runs TypeScript against the packaged declarations.

`pnpm run check:bundle-size` measures a realistic tree-shaken consumer import,
`import { TinyVectors } from '@tummycrypt/tinyvectors'`, with Svelte
externalized as a peer dependency. `//:bundle_size_check` runs the same
measurement against the Bazel-built package artifact. The current gate is
12 KiB gzip and the target remains 11 KiB gzip, so the check reports target
headroom or overage while leaving a small CI buffer.

The bundle-size check also reports tracked runtime modules that enter that
consumer bundle. `dist/core/InteractionField.js` is expected to appear once
runtime physics routes an input through the field contract, and the gzip
result is the source of truth for whether that cost is acceptable.

`bazel query //...` should also work locally. `.bazelignore` excludes direnv,
Nix, package-manager, and build-output directories so Bazel does not walk
generated local artifacts.

## Compatibility Notes

The v0.3 branch currently keeps the renderer-private `--tv-blob-intensity`
custom property used by the restored three-layer renderer. Do not document a
migration to `--tvi`; that abbreviation was part of the reverted gel-rendering
rewrite.

## CI Flow

Pull requests and pushes to `main` run `Verify`, which calls
`tinyland-inc/ci-templates/.github/workflows/js-bazel-package.yml` at a pinned
commit. The reusable workflow:

- installs the configured pnpm and Node major;
- runs metadata, typecheck, test, build, package, and bundle-size checks;
- builds `//:pkg //:package_consumer_check //:bundle_size_check //:typecheck //:test` through Bazelisk;
- validates the Bazel-built package shape with `npm pack --dry-run`.

CI treats the Bazel package output as the release candidate, not the local
`dist/` directory alone. `npm_publish_mode: disabled` means the workflow never
publishes to registry.npmjs.org; the packaging steps exist to validate shape.

## Release Ritual

This is the flow executed for v0.3.5 (2026-07-25) and the template for every
release after it.

1. **Land the release PR on `main`.** The PR bumps the version in
   `package.json`, `MODULE.bazel`, and `BUILD.bazel` together (the metadata
   gate fails otherwise), updates `CHANGELOG.md`, and passes all pre-release
   gates above.
2. **Sign and push the git tag.** Tag the merge commit `vX.Y.Z` with a signed
   tag and push it. The tag archive
   `https://github.com/tinyland-inc/tinyvectors/archive/refs/tags/vX.Y.Z.tar.gz`
   is the release artifact. The tag push runs `publish.yml` with
   `dry_run: false` and `npm_publish_mode: disabled`: the same validation
   lane as CI against the tagged release candidate. registry.npmjs.org is
   never published to (the template's `publish-npm` job is fully gated off by
   `npm_publish_mode: disabled`), but note the template's separate
   `publish-github` job is gated only on `github_package_name` being set and
   `dry_run: false` — with `github_package_name: "@tinyland-inc/tinyvectors"`
   configured, tag runs also attempt a GitHub Packages
   (`npm.pkg.github.com`) publish. v0.3.3/v0.3.4 published there;
   the v0.3.5 attempt failed (E401), leaving the tag run red. The GitHub
   Packages channel's disposition (retire by blanking `github_package_name`,
   or repair auth) is an open operator decision; this doc treats the git tag
   plus the bazel-registry entry as the only authoritative artifacts.
3. **Publish the bazel-registry entry.** Add
   `modules/tummycrypt_tinyvectors/X.Y.Z/` to
   [tinyland-inc/bazel-registry](https://github.com/tinyland-inc/bazel-registry):
   - a `MODULE.bazel` snapshot that is byte-identical to the `MODULE.bazel`
     inside the tag archive;
   - a `source.json` whose URL names that tag archive and whose integrity
     field carries the archive's sha256 in SRI form;
   - an append of `X.Y.Z` to the module's `metadata.json` versions list.
4. **Update consumers.** Migrated pnpm consumers —
   `Jesssullivan/dsa-woodshed.space` and
   `Great-Falls-Tool-Bus/greatfallstoolbus.org` today, with
   `Jesssullivan/jesssullivan.github.io` in review — pin the new tag tarball
   and record the archive's sha256 in their prepare-hook SRI maps
   (`PINNED_INTEGRITY` in each repo's `scripts/build-tinyvectors.mjs`), which
   rebuild `dist/` from source and refuse archives that do not match the
   registry pin. Bazel consumers bump
   `bazel_dep(name = "tummycrypt_tinyvectors", version = "X.Y.Z")`.
   Known unmigrated consumer: `tinyland-inc/transcendsurvival.org` still pins
   0.2.5 from registry.npmjs.org with no verified hook.

A release is not done until the registry entry exists and the consumer pins
match it; the tag alone is necessary but not sufficient.

## npm Channel Status

The npm channel is retired. The last version on registry.npmjs.org is 0.3.0;
0.3.1+ are authoritative as git tags plus bazel-registry entries (v0.3.3 and
v0.3.4 additionally landed on GitHub Packages via the template's
`publish-github` job — see the Release Ritual note above). `package.json`
keeps its `publishConfig` (including `provenance`, which the metadata gate
ties to the workflow's `id-token: write` permission) and its `prepublishOnly`
guard so that release metadata stays internally consistent and any exceptional
future publish would still run the full gate chain — but none is planned, and
`npm_publish_mode: disabled` in both workflows is the enforced default.

## FlakeHub Status

The flake is currently a development environment only. It does not publish
TinyVectors to FlakeHub and does not expose package outputs.

If FlakeHub publication becomes useful, add it as a separate release surface
with its own workflow and metadata checks. FlakeHub publication should use its
trusted-platform publishing model rather than ad hoc local publishing.

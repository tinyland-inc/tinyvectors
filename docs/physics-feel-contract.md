# TinyVectors Physics Feel Contract

TinyVectors is an expressive background system for Svelte and SvelteKit apps, not a physics demo. The animation should feel alive before any user input happens. Device motion, pointer movement, and scrolling should bias that ambient motion instead of taking control of it.

This document is the local source of truth for the field-based interaction work tracked in Linear `TIN-853` and GitHub #40.

## Product Intent

- Pleasant by default: idle blobs drift, breathe, and deform subtly.
- App-safe: the component stays SSR-safe, reduced-motion aware, listener-clean, and small enough for background use.
- Stylable: gel/fluid is a visual language exposed through themes, colors, opacity, and restrained renderer controls.
- Performant: interaction work must preserve the package's bundle budget and avoid heavyweight simulation dependencies.

## Interaction Model

Every input should become a small field sampled by the blob physics loop:

- Ambient field: always on, low-frequency, bounded motion. This is the baseline feel.
- Gravity field: slow directional bias from device orientation. It should make blobs lean or pool, not fall like marbles.
- Pointer field: local soft influence around the pointer. Nearby blobs should react more than distant blobs.
- Scroll field: transient impulse or stickiness that decays. It should not create permanent acceleration.
- Wall field: bounds should keep the background composed without hard visual snaps.
- Input liveness: real sensor and pointer IO should auto-enable only when available. If device-orientation events go quiet, the tab is hidden, the pointer leaves the viewport, or the window blurs, the field must return to neutral instead of preserving stale input.

Fields may combine, but input fields must not erase the ambient field. If a field makes the background look frozen, jittery, or overly coherent, it violates the contract.

## Non-Goals

- Do not revive the Phase A XSPH, soft-wall, and Gaussian anti-clustering rewrite as-is.
- Do not ship coefficient-only tuning without a contract and browser/demo validation.
- Do not introduce a heavyweight fluid solver.
- Do not make the background capture pointer events.

## Test Strategy

Tests should describe perceptual behavior in tolerant terms:

- idle drift is present and bounded;
- gravity creates directional bias without overpowering all motion;
- pointer influence is local and distance-weighted;
- scroll effects decay;
- listener lifecycle stays clean;
- bundle size stays within the configured gate.

Avoid tests that lock exact coefficients, frame-by-frame positions, or one-off screenshot pixels unless the assertion is about a real compatibility contract.

## Implementation Slices

1. Keep PR #39 on the restored pre-Phase-A physics and renderer baseline while retaining the motion harness, lifecycle, pointer, package, and CI work.
2. Add pure field helpers and unit tests without changing runtime feel.
3. Route existing gravity, pointer, and scroll values through field helpers one input at a time.
4. Add browser probes for directional bias, pointer locality, and scroll decay.
5. Revisit renderer stylability after interaction feel is stable.

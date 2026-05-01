# Changelog

## 0.3.0 - 2026-05-01

- Restores the pre-Phase-A gel/blob feel while keeping gravity-led motion, ambient movement, and safer smoothing.
- Adds device-motion status, permission, calibration, idle reset, reduced-motion, and Chrome/CDP browser harness coverage.
- Adds pointer and scroll lifecycle cleanup, stale IO reset behavior, pointer velocity coverage, and a conservative local pointer field.
- Hardens the package release surface with explicit exports, Bazel-built package validation, bundle-size checks, and consumer-package checks.
- Keeps the release bundle under the 12 KiB gzip gate while documenting the remaining 11 KiB target pressure.

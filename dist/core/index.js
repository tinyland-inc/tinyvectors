import { DEFAULT_CONFIG as e, HIGH_CONTRAST_THEME as t, PRIDE_THEME as i, THEME_PRESETS as m, TINYLAND_THEME as a, TRANS_THEME as n, init_schema as o, mergeConfig as E } from "./schema.js";
import { SpatialHash as s } from "./SpatialHash.js";
import { GaussianKernel as S } from "./GaussianKernel.js";
import { DEFAULT_SPRING_CONFIG as c, SpringSystem as f, computeCircularity as l, computePolygonArea as P, createControlPointVelocities as h, enforceAreaConservation as H } from "./SpringSystem.js";
import { BlobPhysics as C } from "./BlobPhysics.js";
import { generateSmoothBlobPath as N, generateSmoothBlobPathSync as g, preInitPathGenerator as G } from "./PathGenerator.js";
import { browser as M, isBrowser as R } from "./browser.js";
o();
export {
  C as BlobPhysics,
  e as DEFAULT_CONFIG,
  c as DEFAULT_SPRING_CONFIG,
  S as GaussianKernel,
  t as HIGH_CONTRAST_THEME,
  i as PRIDE_THEME,
  s as SpatialHash,
  f as SpringSystem,
  m as THEME_PRESETS,
  a as TINYLAND_THEME,
  n as TRANS_THEME,
  M as browser,
  l as computeCircularity,
  P as computePolygonArea,
  h as createControlPointVelocities,
  H as enforceAreaConservation,
  N as generateSmoothBlobPath,
  g as generateSmoothBlobPathSync,
  R as isBrowser,
  E as mergeConfig,
  G as preInitPathGenerator
};

//# sourceMappingURL=index.js.map
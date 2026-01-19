import { DEFAULT_CONFIG as r, HIGH_CONTRAST_THEME as e, PRIDE_THEME as t, THEME_PRESETS as m, TINYLAND_THEME as i, TRANS_THEME as a, mergeConfig as n } from "./core/schema.js";
import { SpatialHash as E } from "./core/SpatialHash.js";
import { GaussianKernel as T } from "./core/GaussianKernel.js";
import { DEFAULT_SPRING_CONFIG as s, SpringSystem as l, computeCircularity as c, computePolygonArea as h, createControlPointVelocities as P, enforceAreaConservation as H } from "./core/SpringSystem.js";
import { BlobPhysics as g } from "./core/BlobPhysics.js";
import { generateSmoothBlobPath as M, generateSmoothBlobPathSync as A, preInitPathGenerator as D } from "./core/PathGenerator.js";
import { browser as I, isBrowser as N } from "./core/browser.js";
import "./core/index.js";
import { DeviceMotion as B } from "./motion/DeviceMotion.js";
import { ScrollHandler as u } from "./motion/ScrollHandler.js";
import { generateThemeCSS as d, getThemePreset as w, isDarkMode as L, watchDarkMode as O } from "./themes/index.js";
import k from "./svelte/BlobSVG.js";
import U from "./svelte/TinyVectors.js";
export {
  g as BlobPhysics,
  k as BlobSVG,
  r as DEFAULT_CONFIG,
  s as DEFAULT_SPRING_CONFIG,
  B as DeviceMotion,
  T as GaussianKernel,
  e as HIGH_CONTRAST_THEME,
  t as PRIDE_THEME,
  u as ScrollHandler,
  E as SpatialHash,
  l as SpringSystem,
  m as THEME_PRESETS,
  i as TINYLAND_THEME,
  a as TRANS_THEME,
  U as TinyVectors,
  I as browser,
  c as computeCircularity,
  h as computePolygonArea,
  P as createControlPointVelocities,
  H as enforceAreaConservation,
  M as generateSmoothBlobPath,
  A as generateSmoothBlobPathSync,
  d as generateThemeCSS,
  w as getThemePreset,
  N as isBrowser,
  L as isDarkMode,
  n as mergeConfig,
  D as preInitPathGenerator,
  O as watchDarkMode
};

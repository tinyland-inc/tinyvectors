import { __esmMin as n, __export as s } from "../_virtual/rolldown_runtime.js";
var u = /* @__PURE__ */ s({
  DEFAULT_CONFIG: () => r,
  HIGH_CONTRAST_THEME: () => i,
  PRIDE_THEME: () => a,
  THEME_PRESETS: () => o,
  TINYLAND_THEME: () => l,
  TRANS_THEME: () => t,
  mergeConfig: () => c
}, 1);
function c(e) {
  return {
    version: "1.0.0",
    core: {
      ...r.core,
      ...e.core
    },
    physics: {
      ...r.physics,
      ...e.physics
    },
    rendering: {
      ...r.rendering,
      ...e.rendering
    },
    theme: {
      ...r.theme,
      ...e.theme
    },
    features: {
      ...r.features,
      ...e.features
    }
  };
}
var r, t, a, l, i, o, d = n((() => {
  r = {
    version: "1.0.0",
    core: {
      blobCount: 12,
      minRadius: 40,
      maxRadius: 160,
      fps: 60,
      animated: !0,
      startDelay: 0
    },
    physics: {
      viscosity: 0.3,
      bounceDamping: 0.7,
      deformationSpeed: 0.5,
      territoryStrength: 0.1,
      antiClusteringStrength: 0.15,
      maxVelocity: 5,
      gravity: 0
    },
    rendering: {
      layers: 4,
      blurRadius: 1.5,
      glowRadius: 4,
      glowOpacity: 0.35,
      enableParticles: !0,
      particlesPerBlob: 3,
      viewBox: {
        margin: 33,
        size: 100
      }
    },
    theme: {
      mode: "system",
      preset: "tinyland",
      cssPrefix: "--vector-",
      blendModeLight: "multiply",
      blendModeDark: "screen"
    },
    features: {
      deviceMotion: !0,
      scrollPhysics: !0,
      lazyLoad: !0,
      webWorker: !1,
      wasmAcceleration: !1,
      debug: !1
    }
  }, t = {
    name: "trans",
    label: "Trans Pride",
    hasVectors: !0,
    blendModeLight: "multiply",
    blendModeDark: "screen",
    colors: [
      {
        id: "trans-blue",
        color: "rgba(91, 206, 250, 0.60)",
        attractive: !0,
        scrollAffinity: 0.8,
        layer: "foreground"
      },
      {
        id: "trans-pink",
        color: "rgba(245, 169, 184, 0.65)",
        attractive: !0,
        scrollAffinity: 0.8,
        layer: "foreground"
      },
      {
        id: "trans-white",
        color: "rgba(242, 242, 245, 0.50)",
        attractive: !1,
        scrollAffinity: 0.5,
        layer: "mid"
      },
      {
        id: "trans-sky-blue",
        color: "rgba(170, 225, 250, 0.55)",
        attractive: !1,
        scrollAffinity: 0.6,
        layer: "mid"
      },
      {
        id: "trans-powder-blue",
        color: "rgba(160, 190, 255, 0.65)",
        attractive: !0,
        scrollAffinity: 0.7,
        layer: "foreground"
      },
      {
        id: "trans-rose-pink",
        color: "rgba(250, 200, 210, 0.55)",
        attractive: !1,
        scrollAffinity: 0.6,
        layer: "mid"
      },
      {
        id: "trans-blush-pink",
        color: "rgba(255, 160, 220, 0.65)",
        attractive: !0,
        scrollAffinity: 0.7,
        layer: "foreground"
      },
      {
        id: "trans-lavender",
        color: "rgba(220, 220, 255, 0.55)",
        attractive: !1,
        scrollAffinity: 0.5,
        layer: "background"
      }
    ]
  }, a = {
    name: "pride",
    label: "Pride Rainbow",
    hasVectors: !0,
    blendModeLight: "multiply",
    blendModeDark: "screen",
    colors: [
      {
        id: "pride-red",
        color: "rgba(228, 3, 3, 0.55)",
        attractive: !0,
        scrollAffinity: 0.9,
        layer: "foreground"
      },
      {
        id: "pride-orange",
        color: "rgba(255, 140, 0, 0.55)",
        attractive: !0,
        scrollAffinity: 0.8,
        layer: "foreground"
      },
      {
        id: "pride-yellow",
        color: "rgba(255, 237, 0, 0.55)",
        attractive: !1,
        scrollAffinity: 0.7,
        layer: "mid"
      },
      {
        id: "pride-green",
        color: "rgba(0, 128, 38, 0.55)",
        attractive: !0,
        scrollAffinity: 0.8,
        layer: "foreground"
      },
      {
        id: "pride-blue",
        color: "rgba(36, 64, 142, 0.55)",
        attractive: !0,
        scrollAffinity: 0.9,
        layer: "foreground"
      },
      {
        id: "pride-purple",
        color: "rgba(115, 41, 130, 0.55)",
        attractive: !0,
        scrollAffinity: 0.8,
        layer: "foreground"
      }
    ]
  }, l = {
    name: "tinyland",
    label: "Tinyland",
    hasVectors: !0,
    blendModeLight: "multiply",
    blendModeDark: "screen",
    colors: [
      {
        id: "tinyland-purple",
        color: "rgba(139, 92, 246, 0.55)",
        attractive: !0,
        scrollAffinity: 0.8,
        layer: "foreground"
      },
      {
        id: "tinyland-blue",
        color: "rgba(59, 130, 246, 0.55)",
        attractive: !0,
        scrollAffinity: 0.7,
        layer: "foreground"
      },
      {
        id: "tinyland-pink",
        color: "rgba(236, 72, 153, 0.50)",
        attractive: !0,
        scrollAffinity: 0.8,
        layer: "mid"
      },
      {
        id: "tinyland-white",
        color: "rgba(242, 242, 245, 0.45)",
        attractive: !1,
        scrollAffinity: 0.4,
        layer: "background"
      }
    ]
  }, i = {
    name: "high-contrast",
    label: "High Contrast",
    hasVectors: !1,
    blendModeLight: "normal",
    blendModeDark: "normal",
    colors: []
  }, o = {
    tinyland: l,
    trans: t,
    pride: a,
    "high-contrast": i,
    custom: {
      name: "custom",
      label: "Custom",
      hasVectors: !0,
      blendModeLight: "multiply",
      blendModeDark: "screen",
      colors: []
    }
  };
}));
d();
export {
  r as DEFAULT_CONFIG,
  i as HIGH_CONTRAST_THEME,
  a as PRIDE_THEME,
  o as THEME_PRESETS,
  l as TINYLAND_THEME,
  t as TRANS_THEME,
  d as init_schema,
  c as mergeConfig,
  u as schema_exports
};

//# sourceMappingURL=schema.js.map
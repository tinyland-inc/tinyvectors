import { __toCommonJS as s } from "../_virtual/rolldown_runtime.js";
import { HIGH_CONTRAST_THEME as m, PRIDE_THEME as E, THEME_PRESETS as d, TINYLAND_THEME as a, TRANS_THEME as f, init_schema as r, schema_exports as c } from "../core/schema.js";
r();
function T(e) {
  const { THEME_PRESETS: t } = (r(), s(c));
  return t[e];
}
function _(e, t = "--vector-") {
  const n = [":root {"];
  for (const o of e.colors) n.push(`  ${t}${o.id}: ${o.color};`);
  return n.push("}"), n.join(`
`);
}
function l() {
  return typeof document > "u" ? !1 : document.documentElement.classList.contains("dark");
}
function S(e) {
  if (typeof document > "u") return () => {
  };
  const t = new MutationObserver((n) => {
    for (const o of n) o.attributeName === "class" && e(document.documentElement.classList.contains("dark"));
  });
  return t.observe(document.documentElement, { attributes: !0 }), e(document.documentElement.classList.contains("dark")), () => t.disconnect();
}
export {
  m as HIGH_CONTRAST_THEME,
  E as PRIDE_THEME,
  d as THEME_PRESETS,
  a as TINYLAND_THEME,
  f as TRANS_THEME,
  _ as generateThemeCSS,
  T as getThemePreset,
  l as isDarkMode,
  S as watchDarkMode
};

//# sourceMappingURL=index.js.map
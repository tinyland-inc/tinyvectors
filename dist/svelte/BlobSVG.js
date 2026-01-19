import { browser as H } from "../core/browser.js";
import { reset as p } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/dom/hydration.js";
import { pop as J, push as K } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/context.js";
import { user_derived as Q } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/reactivity/deriveds.js";
import { set as L, state as T } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/reactivity/sources.js";
import { child as n, first_child as U, sibling as s } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/dom/operations.js";
import { template_effect as c, user_effect as W } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/reactivity/effects.js";
import { get as r } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/runtime.js";
import { append as d, from_svg as f } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/dom/template.js";
import { each as g } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/dom/blocks/each.js";
import { set_style as N } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/dom/elements/style.js";
import { set_attribute as e } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/dom/elements/attributes.js";
import { prop as z } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/reactivity/props.js";
var Z = f('<radialGradient cx="50%" cy="50%" r="80%"><stop offset="0%"></stop><stop offset="40%"></stop><stop offset="70%"></stop><stop offset="100%" stop-opacity="0"></stop></radialGradient><radialGradient cx="50%" cy="50%" r="50%"><stop offset="0%"></stop><stop offset="50%"></stop><stop offset="80%"></stop><stop offset="100%" stop-opacity="0"></stop></radialGradient><radialGradient cx="50%" cy="50%" r="30%"><stop offset="0%"></stop><stop offset="60%"></stop><stop offset="100%"></stop></radialGradient>', 1), b = f("<path></path>"), tt = f("<path></path>"), rt = f("<path></path>"), ot = f('<svg width="100%" height="100%" viewBox="-33 -33 133 133" preserveAspectRatio="xMidYMid slice" class="h-full w-full"><defs><filter id="glowFilter" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="4.0" result="glow"></feGaussianBlur></filter><filter id="softEdge" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="soft"></feGaussianBlur></filter><!></defs><g filter="url(#glowFilter)" opacity="0.35"></g><g filter="url(#softEdge)" opacity="0.75"></g><g opacity="0.9"></g></svg>');
function gt(O, l) {
  K(l, !0);
  let u = z(l, "blobs", 19, () => []);
  z(l, "containerElement", 3, void 0);
  let A = z(l, "physics", 3, null), y = T(!1), C = Q(() => r(y) ? "screen" : "multiply");
  W(() => {
    if (H) {
      L(y, document.documentElement.classList.contains("dark"), !0);
      const o = new MutationObserver((t) => {
        for (const i of t) i.attributeName === "class" && L(y, document.documentElement.classList.contains("dark"), !0);
      });
      return o.observe(document.documentElement, { attributes: !0 }), () => o.disconnect();
    }
  });
  function h(o, t, i) {
    return `M ${o - i},${t} A ${i},${i} 0 1,1 ${o + i},${t} A ${i},${i} 0 1,1 ${o - i},${t}`;
  }
  function R(o) {
    return A() && o.controlPoints && o.controlPoints.length > 0 ? A().generateSmoothBlobPath(o) : h(o.currentX, o.currentY, o.size);
  }
  var _ = ot(), G = n(_), V = s(n(G), 2);
  g(V, 19, u, (o) => o.gradientId, (o, t) => {
    var i = Z(), a = U(i), $ = n(a), B = s($), x = s(B), j = s(x);
    p(a);
    var v = s(a), M = n(v), E = s(M), P = s(E), q = s(P);
    p(v);
    var S = s(v), Y = n(S), k = s(Y), F = s(k);
    p(S), c(() => {
      e(a, "id", `${r(t).gradientId ?? ""}Glow`), e($, "stop-color", r(t).color), e($, "stop-opacity", r(t).intensity * 0.5), e(B, "stop-color", r(t).color), e(B, "stop-opacity", r(t).intensity * 0.3), e(x, "stop-color", r(t).color), e(x, "stop-opacity", r(t).intensity * 0.15), e(j, "stop-color", r(t).color), e(v, "id", `${r(t).gradientId ?? ""}Main`), e(M, "stop-color", r(t).color), e(M, "stop-opacity", r(t).intensity * 0.9), e(E, "stop-color", r(t).color), e(E, "stop-opacity", r(t).intensity * 0.6), e(P, "stop-color", r(t).color), e(P, "stop-opacity", r(t).intensity * 0.3), e(q, "stop-color", r(t).color), e(S, "id", `${r(t).gradientId ?? ""}Core`), e(Y, "stop-color", r(t).color), e(Y, "stop-opacity", r(t).intensity * 1), e(k, "stop-color", r(t).color), e(k, "stop-opacity", r(t).intensity * 0.7), e(F, "stop-color", r(t).color), e(F, "stop-opacity", r(t).intensity * 0.3);
    }), d(o, i);
  }), p(G);
  var w = s(G);
  g(w, 21, u, (o) => o.gradientId, (o, t) => {
    var i = b();
    c((a) => {
      e(i, "d", a), e(i, "fill", `url(#${r(t).gradientId ?? ""}Glow)`);
    }, [() => h(r(t).currentX, r(t).currentY, r(t).size * 2.5)]), d(o, i);
  }), p(w);
  var m = s(w);
  let D;
  g(m, 21, u, (o) => o.gradientId, (o, t) => {
    var i = tt();
    c((a) => {
      e(i, "d", a), e(i, "fill", `url(#${r(t).gradientId ?? ""}Main)`);
    }, [() => R(r(t))]), d(o, i);
  }), p(m);
  var I = s(m);
  let X;
  g(I, 21, u, (o) => o.gradientId, (o, t) => {
    var i = rt();
    c((a) => {
      e(i, "d", a), e(i, "fill", `url(#${r(t).gradientId ?? ""}Core)`);
    }, [() => h(r(t).currentX, r(t).currentY, r(t).size * 0.6)]), d(o, i);
  }), p(I), p(_), c(() => {
    D = N(m, "", D, { "mix-blend-mode": r(C) }), X = N(I, "", X, { "mix-blend-mode": r(C) });
  }), d(O, _), J();
}
export {
  gt as default
};

//# sourceMappingURL=BlobSVG.js.map
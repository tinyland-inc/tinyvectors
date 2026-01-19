import { THEME_PRESETS as $, init_schema as ee } from "../core/schema.js";
import { BlobPhysics as te } from "../core/BlobPhysics.js";
import { browser as M } from "../core/browser.js";
import { DeviceMotion as ie } from "../motion/DeviceMotion.js";
import { ScrollHandler as oe } from "../motion/ScrollHandler.js";
import { reset as ne } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/dom/hydration.js";
import { pop as re, push as se } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/context.js";
import { user_derived as le } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/reactivity/deriveds.js";
import { set as s, state as m } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/reactivity/sources.js";
import { proxy as ce } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/proxy.js";
import { child as ae, first_child as me, sibling as fe } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/dom/operations.js";
import { template_effect as ue, user_effect as H } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/reactivity/effects.js";
import { get as o } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/runtime.js";
import { append as Y, comment as de, from_html as X } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/dom/template.js";
import { if_block as z } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/dom/blocks/if.js";
import { set_style as he } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/dom/elements/style.js";
import { bind_this as pe } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/dom/elements/bindings/this.js";
import { prop as r } from "../node_modules/.pnpm/svelte@5.46.4/node_modules/svelte/src/internal/client/reactivity/props.js";
import ve from "./BlobSVG.js";
import { untrack as ye } from "svelte";
ee();
X('<div class="pointer-events-none fixed top-2 right-2 text-xs opacity-30"> </div>');
var ge = X('<div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true" role="presentation"><!> <!></div>');
function ze(G, n) {
  se(n, !0);
  let O = r(n, "theme", 3, "tinyland"), x = r(n, "colors", 19, () => []), P = r(n, "animated", 3, !0), R = r(n, "opacity", 3, 1), C = r(n, "shouldLoad", 3, !0), I = r(n, "blobCount", 3, 8), U = r(n, "physicsConfig", 19, () => ({})), W = r(n, "enableDeviceMotion", 3, !0), p = r(n, "enableScrollPhysics", 3, !0), v = m(void 0), y = m(ce([])), E = m(!1), f = m(!1), g = m(!1), t = null, l = null, b = 0, a = null, u = null, w = 0, S = 0, k = 0, T = 0, q = 0;
  const _ = le(() => {
    if (x().length > 0) return x();
    const e = $[O()];
    return !e || !e.hasVectors ? [] : e.colors.map((i) => i.color);
  }), Z = {
    antiClusteringStrength: 0.15,
    bounceDamping: 0.7,
    deformationSpeed: 0.5,
    territoryStrength: 0.1,
    viscosity: 0.3
  }, j = () => {
    if (!M) return !1;
    const e = navigator.userAgent.toLowerCase(), i = [
      "mobile",
      "android",
      "iphone",
      "ipad",
      "ipod",
      "blackberry",
      "windows phone"
    ].some((h) => e.includes(h)), c = window.innerWidth <= 768 || window.innerHeight <= 768, d = "ontouchstart" in window || navigator.maxTouchPoints > 0, A = "DeviceOrientationEvent" in window;
    return (i || c && d) && A;
  }, J = (e) => {
    if (!o(g) || !t) return;
    k = e.x, T = e.y, q = e.z;
    const i = e.y * 0.8, c = -e.x * 0.8;
    w = i * 0.7 + w * 0.3, S = c * 0.7 + S * 0.3, t.setGravity({
      x: w,
      y: S
    }), t.setTilt({
      x: k,
      y: T,
      z: q
    });
  }, K = async () => {
    if (!(!o(f) || !a))
      try {
        const e = await a.requestPermission();
        s(g, e, !0), e && console.log("[TinyVectors] Accelerometer access granted");
      } catch (e) {
        console.log("[TinyVectors] Could not request accelerometer permission:", e), s(g, !1);
      }
  }, D = (e) => {
    if (!u || !t) return;
    Math.abs(e.deltaY) > 50 && e.preventDefault(), u.handleScroll(e);
    const i = u.getStickiness() * 0.12;
    t.setScrollStickiness(i);
  };
  function L(e) {
    const i = Math.min((e - b) / 1e3, 0.033);
    b = e, t && (t.tick(i, e / 1e3), s(y, t.getBlobs(o(_)), !0)), l = requestAnimationFrame(L);
  }
  function V() {
    l || (b = performance.now(), l = requestAnimationFrame(L));
  }
  function B() {
    l && (cancelAnimationFrame(l), l = null);
  }
  H(() => {
    if (!(!M || !C()))
      return ye(() => {
        const e = {
          ...Z,
          ...U()
        };
        t = new te(I(), e), t.init().then(() => {
          s(f, j(), !0), s(E, !0), W() && o(f) && (a = new ie(J), a.initialize().then(() => {
            setTimeout(K, 1e3);
          })), p() && (u = new oe()), P() ? V() : t && s(y, t.getBlobs(o(_)), !0);
        }), p() && window.addEventListener("wheel", D, { passive: !1 });
      }), () => {
        B(), p() && M && window.removeEventListener("wheel", D), a?.cleanup(), t?.dispose(), t = null;
      };
  }), H(() => {
    o(E) && (P() ? V() : B());
  });
  var F = de(), N = me(F), Q = (e) => {
    var i = ge();
    let c;
    var d = ae(i);
    ve(d, {
      get blobs() {
        return o(y);
      },
      get containerElement() {
        return o(v);
      },
      get physics() {
        return t;
      }
    });
    var A = fe(d, 2);
    z(A, (h) => {
      o(f);
    }), ne(i), pe(i, (h) => s(v, h), () => o(v)), ue(() => c = he(i, "", c, {
      opacity: R(),
      transition: "opacity 0.8s ease-in-out"
    })), Y(e, i);
  };
  z(N, (e) => {
    C() && o(_).length > 0 && e(Q);
  }), Y(G, F), re();
}
export {
  ze as default
};

//# sourceMappingURL=TinyVectors.js.map
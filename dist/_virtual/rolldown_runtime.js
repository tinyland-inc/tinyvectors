var p = Object.defineProperty, b = Object.getOwnPropertyDescriptor, c = Object.getOwnPropertyNames, l = Object.prototype.hasOwnProperty, O = (e, r) => () => (e && (r = e(e = 0)), r), P = (e, r) => {
  let o = {};
  for (var a in e)
    p(o, a, {
      get: e[a],
      enumerable: !0
    });
  return r && p(o, Symbol.toStringTag, { value: "Module" }), o;
}, g = (e, r, o, a) => {
  if (r && typeof r == "object" || typeof r == "function")
    for (var _ = c(r), n = 0, u = _.length, t; n < u; n++)
      t = _[n], !l.call(e, t) && t !== o && p(e, t, {
        get: ((v) => r[v]).bind(null, t),
        enumerable: !(a = b(r, t)) || a.enumerable
      });
  return e;
}, i = (e) => l.call(e, "module.exports") ? e["module.exports"] : g(p({}, "__esModule", { value: !0 }), e);
export {
  O as __esmMin,
  P as __export,
  i as __toCommonJS
};

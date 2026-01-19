async function f(e) {
  return h(e);
}
function M(e) {
  return h(e);
}
function h(e) {
  const y = e.currentX, u = e.currentY, i = e.size, p = e.phase || 0, c = [];
  for (let n = 0; n < 8; n++) {
    const t = n / 8 * Math.PI * 2, o = 1 + 0.1 * Math.sin(t * 2 + p), r = y + Math.cos(t) * i * o, a = u + Math.sin(t) * i * o;
    c.push({
      x: r,
      y: a
    });
  }
  let x = `M ${c[0].x.toFixed(2)},${c[0].y.toFixed(2)}`;
  const s = 0.15;
  for (let n = 0; n < 8; n++) {
    const t = c[n], o = c[(n + 1) % 8], r = c[(n + 2) % 8], a = t.x + (o.x - t.x) * s, d = t.y + (o.y - t.y) * s, F = o.x - (r.x - t.x) * (s * 0.3), $ = o.y - (r.y - t.y) * (s * 0.3);
    x += ` C ${a.toFixed(2)},${d.toFixed(2)} ${F.toFixed(2)},${$.toFixed(2)} ${o.x.toFixed(2)},${o.y.toFixed(2)}`;
  }
  return x += " Z", x;
}
async function g() {
  return !0;
}
export {
  f as generateSmoothBlobPath,
  M as generateSmoothBlobPathSync,
  g as preInitPathGenerator
};

//# sourceMappingURL=PathGenerator.js.map
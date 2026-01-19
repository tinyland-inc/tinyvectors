const C = {
  springConstant: 0.08,
  dampingCoeff: 0.12,
  couplingStrength: 0.05,
  surfaceTension: 0.03,
  pressure: 1,
  maxDeformation: 0.3,
  maxVelocity: 2
};
var R = class {
  config;
  constructor(t = {}) {
    this.config = {
      ...C,
      ...t
    };
  }
  /**
  * Update a single control point using spring physics
  *
  * @param point - Control point to update
  * @param velocity - Velocity state for the control point
  * @param leftNeighbor - Left neighboring control point
  * @param rightNeighbor - Right neighboring control point
  * @param externalForce - External radial force (from collisions, gravity, etc.)
  * @param dt - Delta time in seconds
  */
  updateControlPoint(t, n, a, e, s, i) {
    const o = t.radius - t.baseRadius, r = -this.config.springConstant * o, c = (a.radius + e.radius) / 2, l = t.radius - c, f = -this.config.surfaceTension * l, d = (this.config.pressure - 1) * t.baseRadius * 0.01, h = a.radius - t.radius, m = e.radius - t.radius, y = this.config.couplingStrength * (h + m) * 0.5, V = -this.config.dampingCoeff * n.radialVelocity, p = s, x = r + f + d + y + V + p;
    n.radialVelocity += x * i, n.radialVelocity = Math.max(-this.config.maxVelocity, Math.min(this.config.maxVelocity, n.radialVelocity)), t.radius += n.radialVelocity * i;
    const u = t.baseRadius * (1 - this.config.maxDeformation), g = t.baseRadius * (1 + this.config.maxDeformation);
    t.radius = Math.max(u, Math.min(g, t.radius)), (t.radius === u || t.radius === g) && (n.radialVelocity *= 0.3);
  }
  /**
  * Update all control points for a blob
  *
  * @param points - Array of control points
  * @param velocities - Array of velocity states
  * @param externalForces - Per-point external forces (or single force for all)
  * @param dt - Delta time in seconds
  */
  updateAllControlPoints(t, n, a, e) {
    const s = t.length;
    if (!(s < 3))
      for (let i = 0; i < s; i++) {
        const o = (i - 1 + s) % s, r = (i + 1) % s, c = Array.isArray(a) ? a[i] || 0 : a;
        this.updateControlPoint(t[i], n[i], t[o], t[r], c, e);
      }
  }
  /**
  * Apply an impulse to control points (for collisions, bounces)
  *
  * @param points - Control points array
  * @param velocities - Velocities array
  * @param impulseDirection - Angle of impulse (radians)
  * @param impulseMagnitude - Strength of impulse
  */
  applyImpulse(t, n, a, e) {
    for (let s = 0; s < t.length; s++) {
      const i = t[s], o = n[s], r = Math.cos(i.angle - a);
      o.radialVelocity -= r * e;
    }
  }
  /**
  * Apply pressure change to all points (for blob-blob interaction)
  *
  * @param velocities - Velocities array
  * @param pressureChange - Amount to change pressure (-1 to 1)
  */
  applyPressure(t, n) {
    for (const a of t) a.radialVelocity += n * 0.1;
  }
  /**
  * Get total kinetic energy of control points (for debugging)
  */
  getKineticEnergy(t) {
    let n = 0;
    for (const a of t) n += 0.5 * a.radialVelocity * a.radialVelocity;
    return n;
  }
  /**
  * Get total potential energy (spring displacement)
  */
  getPotentialEnergy(t) {
    let n = 0;
    for (const a of t) {
      const e = a.radius - a.baseRadius;
      n += 0.5 * this.config.springConstant * e * e;
    }
    return n;
  }
  /**
  * Check if system is at rest (low energy)
  */
  isAtRest(t, n, a = 1e-3) {
    return this.getKineticEnergy(n) + this.getPotentialEnergy(t) < a;
  }
  /**
  * Update configuration
  */
  setConfig(t) {
    this.config = {
      ...this.config,
      ...t
    };
  }
  /**
  * Get current configuration
  */
  getConfig() {
    return { ...this.config };
  }
};
function F(t) {
  const n = [];
  for (let a = 0; a < t; a++) n.push({
    radialVelocity: 0,
    angularVelocity: (Math.random() - 0.5) * 4e-4,
    pressureVelocity: 0
  });
  return n;
}
function M(t) {
  if (t.length < 3) return 0;
  let n = 0;
  const a = t.length;
  for (let e = 0; e < a; e++) {
    const s = t[e], i = t[(e + 1) % a], o = Math.cos(s.angle) * s.radius, r = Math.sin(s.angle) * s.radius, c = Math.cos(i.angle) * i.radius, l = Math.sin(i.angle) * i.radius;
    n += o * l - c * r;
  }
  return Math.abs(n) / 2;
}
function P(t, n, a = 0.05) {
  const e = M(t) / n;
  if (Math.abs(e - 1) > a) {
    const s = Math.sqrt(1 / e);
    for (const i of t) i.radius *= s;
  }
}
function _(t) {
  if (t.length === 0) return 1;
  let n = 0;
  for (const s of t) n += s.radius;
  const a = n / t.length;
  let e = 0;
  for (const s of t) {
    const i = s.radius - a;
    e += i * i;
  }
  return e /= t.length, 1 / (1 + Math.sqrt(e) / a * 5);
}
export {
  C as DEFAULT_SPRING_CONFIG,
  R as SpringSystem,
  _ as computeCircularity,
  M as computePolygonArea,
  F as createControlPointVelocities,
  P as enforceAreaConservation
};

//# sourceMappingURL=SpringSystem.js.map
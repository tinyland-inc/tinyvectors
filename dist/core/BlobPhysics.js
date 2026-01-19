import { SpatialHash as S } from "./SpatialHash.js";
import { GaussianKernel as p } from "./GaussianKernel.js";
import { DEFAULT_SPRING_CONFIG as v, SpringSystem as Y } from "./SpringSystem.js";
var x = {
  antiClusteringStrength: 0.15,
  bounceDamping: 0.7,
  deformationSpeed: 0.5,
  territoryStrength: 0.1,
  viscosity: 0.3,
  useSpatialHash: !0,
  useGaussianSmoothing: !0,
  useSpringSystem: !0,
  springConfig: {}
}, C = class {
  blobs = [];
  config;
  numBlobs;
  initialized = !1;
  mouseX = 50;
  mouseY = 50;
  mouseVelX = 0;
  mouseVelY = 0;
  lastMouseX = 50;
  lastMouseY = 50;
  gravity = {
    x: 0,
    y: 0
  };
  tilt = {
    x: 0,
    y: 0,
    z: 0
  };
  scrollStickiness = 0;
  PHYSICS_MIN = -40;
  PHYSICS_MAX = 140;
  spatialHash;
  gaussianKernel;
  springSystem;
  constructor(t, e = {}) {
    this.numBlobs = t, this.config = {
      ...x,
      ...e
    }, this.spatialHash = new S(60), this.gaussianKernel = new p(5, 1.2), this.springSystem = new Y({
      ...v,
      ...this.config.springConfig
    });
  }
  /**
  * Initialize physics - creates blobs
  */
  async init() {
    this.initialized || (this.initializeBlobs(), this.initialized = !0);
  }
  /**
  * Check if physics is ready
  */
  isReady() {
    return this.initialized;
  }
  /**
  * Cleanup resources
  */
  dispose() {
    this.blobs = [], this.initialized = !1;
  }
  /**
  * Update accelerometer/gravity data
  */
  setGravity(t) {
    this.gravity = t;
  }
  /**
  * Update tilt data
  */
  setTilt(t) {
    this.tilt = t;
  }
  /**
  * Update scroll stickiness
  */
  setScrollStickiness(t) {
    this.scrollStickiness = t;
  }
  /**
  * Main physics tick - updates all blobs
  */
  tick(t, e) {
    this.initialized && (this.config.useSpatialHash && this.spatialHash.rebuild(this.blobs), this.config.useSpatialHash ? this.applyAntiClusteringWithSpatialHash() : this.applyEnhancedAntiClustering(), this.blobs.forEach((i) => this.updateScreensaverPhysics(i, t, e)), this.mouseVelX *= 0.96, this.mouseVelY *= 0.96);
  }
  /**
  * Apply anti-clustering using spatial hash (O(n) average case)
  */
  applyAntiClusteringWithSpatialHash() {
    for (const e of this.blobs) {
      const i = this.spatialHash.queryNeighbors(e, 60);
      for (const n of i) {
        const o = n.currentX - e.currentX, a = n.currentY - e.currentY, s = Math.sqrt(o * o + a * a), c = Math.max(e.personalSpace || 50, n.personalSpace || 50);
        if (s < c && s > 0) {
          const r = (c - s) / c * 0.055 * this.config.antiClusteringStrength / 0.15, h = o / s, d = a / s, l = e.repulsionStrength || 0.03, u = s < c * 0.7 ? 3.5 : 1;
          e.velocityX -= h * r * l * u * 0.5, e.velocityY -= d * r * l * u * 0.5, e.lastRepulsionTime = Date.now();
        }
      }
    }
  }
  /**
  * Update mouse position for interactions
  */
  updateMousePosition(t, e) {
    this.mouseVelX = t - this.lastMouseX, this.mouseVelY = e - this.lastMouseY, this.lastMouseX = this.mouseX, this.lastMouseY = this.mouseY, this.mouseX = t, this.mouseY = e;
  }
  /**
  * Get blobs for rendering
  */
  getBlobs(t) {
    return t && t.length > 0 ? this.blobs.map((e, i) => ({
      ...e,
      color: t[i % t.length]
    })) : this.blobs;
  }
  /**
  * Generate smooth SVG path for organic blob shape
  */
  generateSmoothBlobPath(t) {
    if (!t.controlPoints || t.controlPoints.length < 3) {
      const s = t.currentX, c = t.currentY, r = t.size;
      return `M ${s - r},${c}
					A ${r},${r} 0 1,1 ${s + r},${c}
					A ${r},${r} 0 1,1 ${s - r},${c}`;
    }
    const e = t.currentX, i = t.currentY, n = t.controlPoints.map((s) => ({
      x: e + Math.cos(s.angle) * s.radius,
      y: i + Math.sin(s.angle) * s.radius
    })), o = this.generateConvexHull(n);
    let a = `M ${o[0].x.toFixed(2)},${o[0].y.toFixed(2)}`;
    for (let s = 0; s < o.length; s++) {
      const c = o[s], r = o[(s + 1) % o.length], h = o[(s + 2) % o.length], d = c.x + (r.x - c.x) * 0.15, l = c.y + (r.y - c.y) * 0.15, u = r.x - (h.x - c.x) * 0.05, m = r.y - (h.y - c.y) * 0.05;
      a += ` C ${d.toFixed(2)},${l.toFixed(2)} ${u.toFixed(2)},${m.toFixed(2)} ${r.x.toFixed(2)},${r.y.toFixed(2)}`;
    }
    return a += " Z", a;
  }
  initializeBlobs() {
    this.blobs = [];
    for (let t = 0; t < this.numBlobs; t++) {
      const e = Math.ceil(Math.sqrt(this.numBlobs)), i = Math.ceil(this.numBlobs / e), n = t % e, o = Math.floor(t / e), a = (this.PHYSICS_MAX - this.PHYSICS_MIN - 40) / e, s = (this.PHYSICS_MAX - this.PHYSICS_MIN - 40) / i, c = this.PHYSICS_MIN + 20 + n * a + a / 2 + (Math.random() - 0.5) * a * 0.5, r = this.PHYSICS_MIN + 20 + o * s + s / 2 + (Math.random() - 0.5) * s * 0.5, h = Math.max(this.PHYSICS_MIN + 20, Math.min(this.PHYSICS_MAX - 20, c)), d = Math.max(this.PHYSICS_MIN + 20, Math.min(this.PHYSICS_MAX - 20, r)), l = 15 + Math.random() * 12, u = 8, m = [], g = [];
      for (let M = 0; M < u; M++) {
        const f = M / u * Math.PI * 2, y = l * (0.8 + Math.random() * 0.35);
        m.push({
          radius: y,
          angle: f,
          targetRadius: y,
          baseRadius: y,
          pressure: 1,
          adhesion: 0.15 + Math.random() * 0.1,
          tension: 0.3 + Math.random() * 0.15
        }), g.push({
          radialVelocity: 0,
          angularVelocity: (Math.random() - 0.5) * 4e-4,
          pressureVelocity: 0
        });
      }
      this.blobs.push({
        baseX: h,
        baseY: d,
        currentX: h,
        currentY: d,
        velocityX: (Math.random() - 0.5) * 0.02,
        velocityY: (Math.random() - 0.5) * 0.02,
        size: l,
        elasticity: 4e-4 + Math.random() * 2e-4,
        viscosity: 0.995 + Math.random() * 3e-3,
        phase: Math.random() * Math.PI * 2,
        speed: 3e-3 + Math.random() * 2e-3,
        color: `hsl(${t * 30 % 360}, 70%, 60%)`,
        gradientId: `blob-gradient-${t}`,
        intensity: 0.65 + Math.random() * 0.2,
        stickiness: 2,
        isAttractive: t % 2 === 0,
        mouseDistance: 100,
        isStuck: !1,
        radiusVariations: [],
        fluidMass: 0.5 + Math.random() * 0.25,
        scrollAffinity: 0.3 + Math.random() * 0.5,
        surfaceTension: 0.02 + Math.random() * 0.01,
        density: 0.4 + Math.random() * 0.1,
        flowResistance: 2e-3 + Math.random() * 1e-3,
        controlPoints: m,
        controlVelocities: g,
        deformationStrength: 0.3 + Math.random() * 0.15,
        cohesion: 0.05 + Math.random() * 0.03,
        stretchability: 0.8 + Math.random() * 0.3,
        lastCollisionTime: 0,
        mergeThreshold: l * 0.5,
        splitThreshold: l * 1.5,
        isSettled: !1,
        settleTime: 0,
        groundContactPoints: [],
        restHeight: l * 0.7,
        wetting: 0.15 + Math.random() * 0.1,
        contactAngle: 70 + Math.random() * 30,
        pressureDistribution: new Array(u).fill(1),
        chaosLevel: 0,
        turbulenceDecay: 0.985,
        expansionPhase: !1,
        expansionTime: 0,
        maxExpansionTime: 20 + Math.random() * 40,
        wallBounceCount: 0,
        lastBounceTime: 0,
        driftAngle: Math.random() * Math.PI * 2,
        driftSpeed: 0.01 + Math.random() * 0.015,
        territoryRadius: 100 + Math.random() * 60,
        territoryX: h,
        territoryY: d,
        personalSpace: 35 + Math.random() * 20,
        repulsionStrength: 0.025 + Math.random() * 0.015,
        lastRepulsionTime: 0
      });
    }
  }
  applyEnhancedAntiClustering() {
    for (let t = 0; t < this.blobs.length; t++) {
      const e = this.blobs[t];
      for (let i = t + 1; i < this.blobs.length; i++) {
        const n = this.blobs[i], o = n.currentX - e.currentX, a = n.currentY - e.currentY, s = Math.sqrt(o * o + a * a), c = Math.max(e.personalSpace || 50, n.personalSpace || 50);
        if (s < c && s > 0) {
          const r = (c - s) / c * 0.055 * this.config.antiClusteringStrength / 0.15, h = o / s, d = a / s, l = e.repulsionStrength || 0.03, u = n.repulsionStrength || 0.03, m = s < c * 0.7 ? 3.5 : 1;
          e.velocityX -= h * r * l * m, e.velocityY -= d * r * l * m, n.velocityX += h * r * u * m, n.velocityY += d * r * u * m, e.lastRepulsionTime = Date.now(), n.lastRepulsionTime = Date.now();
        }
      }
    }
  }
  updateScreensaverPhysics(t, e, i) {
    t.mouseDistance = Math.sqrt(Math.pow(t.currentX - this.mouseX, 2) + Math.pow(t.currentY - this.mouseY, 2)), this.updateTerritorialMovement(t, i), this.applyAccelerometerForces(t), this.updateMovementWithAccelerometer(t, i), this.addEscapeVelocity(t), this.updateSafeOrganicDeformation(t, i), this.scrollStickiness > 0.01 && this.applyScrollEffect(t), t.currentX += t.velocityX, t.currentY += t.velocityY, this.handleWallBouncing(t), t.velocityX *= 0.992, t.velocityY *= 0.992;
  }
  applyAccelerometerForces(t) {
    const n = Math.max(-3e-3, Math.min(3e-3, this.gravity.x * 8e-4)), o = Math.max(-3e-3, Math.min(3e-3, this.gravity.y * 8e-4));
    if (t.velocityX += n, t.velocityY += o, t.controlPoints && (Math.abs(this.gravity.x) > 0.3 || Math.abs(this.gravity.y) > 0.3)) {
      const a = Math.min(0.08, (Math.abs(this.gravity.x) + Math.abs(this.gravity.y)) * 0.02);
      t.chaosLevel = Math.min((t.chaosLevel || 0) + a, 0.2);
    }
  }
  updateMovementWithAccelerometer(t, e) {
    const i = (Math.random() - 0.5) * 1e-3, n = (Math.random() - 0.5) * 1e-3;
    t.velocityX += i, t.velocityY += n;
    const o = e * 0.1 + t.phase, a = Math.sin(o + (t.driftAngle || 0)) * 5e-4, s = Math.cos(o * 1.3 + (t.driftAngle || 0)) * 5e-4;
    t.velocityX += a, t.velocityY += s, Math.random() < 2e-3 && (t.driftAngle = Math.random() * Math.PI * 2);
  }
  updateTerritorialMovement(t, e) {
    const i = t.territoryX || t.baseX, n = t.territoryY || t.baseY, o = t.territoryRadius || 70, a = Math.sqrt(Math.pow(t.currentX - i, 2) + Math.pow(t.currentY - n, 2));
    if (a > o) {
      const s = (a - o) / o * 2e-4 * this.config.territoryStrength / 0.1, c = Math.atan2(n - t.currentY, i - t.currentX);
      t.velocityX += Math.cos(c) * s, t.velocityY += Math.sin(c) * s;
    }
    t.velocityX += (Math.random() - 0.5) * 3e-3, t.velocityY += (Math.random() - 0.5) * 3e-3, e % 45 < 0.1 && (t.territoryX = Math.max(this.PHYSICS_MIN + 35, Math.min(this.PHYSICS_MAX - 35, i + (Math.random() - 0.5) * 35)), t.territoryY = Math.max(this.PHYSICS_MIN + 35, Math.min(this.PHYSICS_MAX - 35, n + (Math.random() - 0.5) * 35)));
  }
  addEscapeVelocity(t) {
    if (t.lastRepulsionTime && Date.now() - t.lastRepulsionTime < 3e3) {
      const i = Math.random() * Math.PI * 2;
      t.velocityX += Math.cos(i) * 0.01, t.velocityY += Math.sin(i) * 0.01;
    }
  }
  updateSafeOrganicDeformation(t, e) {
    !t.controlPoints || !t.controlVelocities || (this.config.useSpringSystem ? this.updateSpringDeformation(t, e) : this.updateSinusoidalDeformation(t, e), this.config.useGaussianSmoothing ? this.gaussianKernel.convolve(t.controlPoints) : this.smoothControlPoints(t));
  }
  /**
  * Spring-based deformation (physically-based gel simulation)
  */
  updateSpringDeformation(t, e) {
    if (!t.controlPoints || !t.controlVelocities) return;
    const i = Math.sqrt(t.velocityX * t.velocityX + t.velocityY * t.velocityY), n = Math.atan2(t.velocityY, t.velocityX), o = t.controlPoints.map((a) => -Math.cos(a.angle - n) * i * 0.5);
    if (t.chaosLevel && t.chaosLevel > 0.01) for (let a = 0; a < o.length; a++) o[a] += (Math.random() - 0.5) * t.chaosLevel * 0.3;
    this.springSystem.updateAllControlPoints(t.controlPoints, t.controlVelocities, o, 0.016);
    for (let a = 0; a < t.controlPoints.length; a++) {
      const s = t.controlVelocities[a];
      s.angularVelocity += (Math.random() - 0.5) * 2e-5, s.angularVelocity *= 0.998, s.angularVelocity = Math.max(-6e-4, Math.min(6e-4, s.angularVelocity)), t.controlPoints[a].angle += s.angularVelocity;
    }
    t.chaosLevel && (t.chaosLevel *= t.turbulenceDecay || 0.985);
  }
  /**
  * Sinusoidal deformation (fallback, decorative only)
  */
  updateSinusoidalDeformation(t, e) {
    !t.controlPoints || !t.controlVelocities || t.controlPoints.forEach((i, n) => {
      const o = e * 0.15 * this.config.deformationSpeed / 0.5 + n * 0.4 + t.phase, a = Math.sin(o) * 0.02, s = i.baseRadius * 0.85, c = i.baseRadius * 1.15, r = i.baseRadius * (1 + a);
      i.targetRadius = Math.max(s, Math.min(c, r));
      const h = i.targetRadius - i.radius;
      i.radius += h * 8e-3, t.controlVelocities && t.controlVelocities[n] && (t.controlVelocities[n].angularVelocity += (Math.random() - 0.5) * 3e-5, t.controlVelocities[n].angularVelocity *= 0.999, t.controlVelocities[n].angularVelocity = Math.max(-8e-4, Math.min(8e-4, t.controlVelocities[n].angularVelocity)), i.angle += t.controlVelocities[n].angularVelocity);
    });
  }
  smoothControlPoints(t) {
    if (!(!t.controlPoints || t.controlPoints.length < 3))
      for (let e = 0; e < t.controlPoints.length; e++) {
        const i = t.controlPoints[e], n = t.controlPoints[(e - 1 + t.controlPoints.length) % t.controlPoints.length], o = t.controlPoints[(e + 1) % t.controlPoints.length], a = (n.radius + i.radius + o.radius) / 3, s = 0.05;
        i.radius = i.radius * (1 - s) + a * s;
        const c = t.size * 0.1;
        if (Math.abs(i.radius - n.radius) > c) {
          const r = (Math.abs(i.radius - n.radius) - c) * 0.5;
          i.radius > n.radius ? (i.radius -= r, n.radius += r) : (i.radius += r, n.radius -= r);
        }
      }
  }
  applyScrollEffect(t) {
    const e = this.scrollStickiness * t.scrollAffinity * 2e-4;
    t.velocityX += (this.mouseX - t.currentX) * e, t.velocityY += (this.mouseY - t.currentY) * e, this.scrollStickiness > 0.15 && (t.chaosLevel = Math.min((t.chaosLevel || 0) + this.scrollStickiness * 0.02, 0.15));
  }
  handleWallBouncing(t) {
    const e = t.size * 0.8, i = this.config.bounceDamping, n = Date.now();
    t.currentX < this.PHYSICS_MIN + e && (t.currentX = this.PHYSICS_MIN + e, t.velocityX = Math.abs(t.velocityX) * i, this.recordBounce(t, n)), t.currentX > this.PHYSICS_MAX - e && (t.currentX = this.PHYSICS_MAX - e, t.velocityX = -Math.abs(t.velocityX) * i, this.recordBounce(t, n)), t.currentY < this.PHYSICS_MIN + e * 1.5 && (t.currentY = this.PHYSICS_MIN + e * 1.5, t.velocityY = Math.abs(t.velocityY) * i, this.recordBounce(t, n)), t.currentY > this.PHYSICS_MAX - e * 1.5 && (t.currentY = this.PHYSICS_MAX - e * 1.5, t.velocityY = -Math.abs(t.velocityY) * i, this.recordBounce(t, n));
  }
  recordBounce(t, e) {
    t.wallBounceCount = (t.wallBounceCount || 0) + 1, t.lastBounceTime = e, t.velocityX += (Math.random() - 0.5) * 0.05, t.velocityY += (Math.random() - 0.5) * 0.05, t.driftAngle = Math.random() * Math.PI * 2, t.controlPoints && (t.chaosLevel = Math.min((t.chaosLevel || 0) + 0.04, 0.15));
  }
  generateConvexHull(t) {
    if (t.length < 3) return t;
    const e = t.length * 2;
    let i = 0;
    const n = [];
    let o = t[0], a = 0;
    for (let c = 0; c < t.length; c++) {
      const r = t[c];
      (r.y < o.y || r.y === o.y && r.x < o.x) && (o = r, a = c);
    }
    let s = a;
    do {
      n.push(t[s]);
      let c = 0;
      for (let r = 0; r < t.length; r++) (c === s || this.isLeftTurn(t[s], t[c], t[r])) && (c = r);
      s = c, i++;
    } while (s !== a && n.length < t.length && i < e);
    return n;
  }
  isLeftTurn(t, e, i) {
    return (e.x - t.x) * (i.y - t.y) - (e.y - t.y) * (i.x - t.x) > 0;
  }
};
export {
  C as BlobPhysics
};

//# sourceMappingURL=BlobPhysics.js.map
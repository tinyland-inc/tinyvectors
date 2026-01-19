var o = class {
  stickiness = 0;
  lastScrollTime = 0;
  scrollVelocity = 0;
  decayRate = 0.92;
  totalScrollDistance = 0;
  scrollStartTime = 0;
  isScrolling = !1;
  scrollDirection = 0;
  pullForces = [];
  peakVelocity = 0;
  constructor(s) {
    s?.decayRate && (this.decayRate = s.decayRate);
  }
  handleScroll(s) {
    const t = Date.now(), c = t - this.lastScrollTime;
    this.scrollDirection = s.deltaY > 0 ? 1 : -1, (!this.isScrolling || c > 200) && (this.isScrolling = !0, this.scrollStartTime = t, this.totalScrollDistance = 0, this.peakVelocity = 0), this.totalScrollDistance += Math.abs(s.deltaY);
    const l = Math.abs(s.deltaY) / Math.max(c, 16);
    this.peakVelocity = Math.max(this.peakVelocity, l), this.scrollVelocity = this.scrollVelocity * 0.7 + l * 0.3;
    const i = Math.min(this.scrollVelocity / 1.5, 2), e = Math.min(this.totalScrollDistance / 400, 2.5), r = i * e > 2 || i > 1.2 && e > 1;
    let a = Math.max(i, e * 0.9);
    r && (a = Math.min(a * 1.8, 4)), this.stickiness = Math.max(this.stickiness, a), (i > 0.3 || e > 0.3 || r) && this.generatePullForce(i, e, this.scrollDirection, r), this.lastScrollTime = t, this.startDecay(), setTimeout(() => {
      t - this.lastScrollTime >= 200 && (this.isScrolling = !1, this.totalScrollDistance = 0, this.peakVelocity = 0);
    }, 200);
  }
  generatePullForce(s, t, c, l) {
    if (c <= 0 || s > 0.4 || t > 0.4 || l) {
      let i = s + t * 0.7;
      l ? i = Math.min(i * 2.5, 8) : i = Math.min(i, 3);
      const e = l ? 0.6 + Math.random() * 0.4 : 0.4 + Math.random() * 0.5;
      this.pullForces.push({
        strength: i,
        time: 0,
        randomness: e,
        explosive: l
      }), this.pullForces.length > (l ? 10 : 8) && this.pullForces.shift();
    }
  }
  startDecay() {
    const s = () => {
      this.stickiness *= this.decayRate, this.scrollVelocity *= this.decayRate, this.pullForces = this.pullForces.filter((t) => (t.time += 0.016, t.time < (t.explosive ? 3.5 : 2))).map((t) => ({
        ...t,
        strength: t.strength * (t.explosive ? 0.995 : 0.98)
      })), this.stickiness > 0.01 || this.pullForces.length > 0 ? requestAnimationFrame(s) : (this.stickiness = 0, this.scrollVelocity = 0);
    };
    requestAnimationFrame(s);
  }
  getStickiness() {
    return this.stickiness;
  }
  getScrollVelocity() {
    return this.scrollVelocity;
  }
  getTotalScrollDistance() {
    return this.totalScrollDistance;
  }
  getPullForces() {
    return this.pullForces;
  }
  getScrollDirection() {
    return this.scrollDirection;
  }
  isActivelyScrolling() {
    return this.isScrolling;
  }
  getPeakVelocity() {
    return this.peakVelocity;
  }
};
export {
  o as ScrollHandler
};

//# sourceMappingURL=ScrollHandler.js.map
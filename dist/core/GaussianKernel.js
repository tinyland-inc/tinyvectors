var l = class {
  weights;
  halfSize;
  size;
  /**
  * Create a Gaussian kernel
  * @param size - Kernel size (must be odd, e.g., 3, 5, 7)
  * @param sigma - Standard deviation (higher = more smoothing)
  */
  constructor(s = 5, e = 1) {
    this.size = s % 2 === 0 ? s + 1 : s, this.halfSize = Math.floor(this.size / 2), this.weights = new Float32Array(this.size), this.computeWeights(e);
  }
  /**
  * Compute normalized Gaussian weights
  */
  computeWeights(s) {
    let e = 0;
    const r = 2 * s * s;
    for (let t = 0; t < this.size; t++) {
      const h = t - this.halfSize, i = Math.exp(-(h * h) / r);
      this.weights[t] = i, e += i;
    }
    for (let t = 0; t < this.size; t++) this.weights[t] /= e;
  }
  /**
  * Convolve control point radii with Gaussian kernel
  * Uses circular buffer wrap-around for closed shapes
  *
  * @param points - Array of control points to smooth (mutates in place)
  */
  convolve(s) {
    const e = s.length;
    if (e < 3) return;
    const r = new Float32Array(e);
    for (let t = 0; t < e; t++) r[t] = s[t].radius;
    for (let t = 0; t < e; t++) {
      let h = 0;
      for (let i = 0; i < this.size; i++) {
        const o = (t + i - this.halfSize + e) % e;
        h += r[o] * this.weights[i];
      }
      s[t].radius = h;
    }
  }
  /**
  * Convolve a Float32Array of radii (for worker/WASM use)
  *
  * @param radii - Array of radii values
  * @param count - Number of control points
  * @returns New Float32Array with smoothed values
  */
  convolveArray(s, e) {
    const r = new Float32Array(e);
    for (let t = 0; t < e; t++) {
      let h = 0;
      for (let i = 0; i < this.size; i++) {
        const o = (t + i - this.halfSize + e) % e;
        h += s[o] * this.weights[i];
      }
      r[t] = h;
    }
    return r;
  }
  /**
  * Get the kernel weights (for debugging/testing)
  */
  getWeights() {
    return this.weights;
  }
  /**
  * Get kernel size
  */
  getSize() {
    return this.size;
  }
  /**
  * Compute variance of radii array (for PBT testing)
  */
  static computeVariance(s) {
    const e = s.length;
    if (e === 0) return 0;
    let r = 0;
    for (let i = 0; i < e; i++) r += s[i];
    const t = r / e;
    let h = 0;
    for (let i = 0; i < e; i++) {
      const o = s[i] - t;
      h += o * o;
    }
    return h / e;
  }
};
export {
  l as GaussianKernel
};

//# sourceMappingURL=GaussianKernel.js.map
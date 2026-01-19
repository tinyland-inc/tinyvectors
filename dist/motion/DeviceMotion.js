var r = class {
  callback;
  isListening = !1;
  useMotionAPI = !1;
  constructor(e) {
    this.callback = e;
  }
  async initialize() {
    if (!(typeof window > "u")) {
      if (!window.isSecureContext) {
        console.warn("DeviceMotion APIs require a secure context (HTTPS)");
        return;
      }
      if ("DeviceMotionEvent" in window) this.useMotionAPI = !0;
      else if ("DeviceOrientationEvent" in window) this.useMotionAPI = !1;
      else {
        console.log("No device motion/orientation APIs supported");
        return;
      }
      await this.requestPermission() ? this.startListening() : console.warn("Device motion permission denied or not available");
    }
  }
  async requestPermission() {
    if (this.useMotionAPI && typeof DeviceMotionEvent.requestPermission == "function") try {
      return await DeviceMotionEvent.requestPermission() === "granted";
    } catch (e) {
      return console.error("Error requesting device motion permission:", e), !1;
    }
    else if (!this.useMotionAPI && typeof DeviceOrientationEvent.requestPermission == "function") try {
      return await DeviceOrientationEvent.requestPermission() === "granted";
    } catch (e) {
      return console.error("Error requesting device orientation permission:", e), !1;
    }
    return !0;
  }
  startListening() {
    this.isListening || (this.useMotionAPI ? window.addEventListener("devicemotion", this.handleMotion) : window.addEventListener("deviceorientation", this.handleOrientation), this.isListening = !0);
  }
  handleMotion = (e) => {
    try {
      if (!e.accelerationIncludingGravity) return;
      const { x: i, y: n, z: t } = e.accelerationIncludingGravity;
      if (i === null || n === null || t === null) return;
      const o = {
        x: Math.max(-1, Math.min(1, i / 9.8)),
        y: Math.max(-1, Math.min(1, n / 9.8)),
        z: Math.max(-1, Math.min(1, t / 9.8))
      };
      this.callback(o);
    } catch (i) {
      console.error("Error handling device motion:", i);
    }
  };
  handleOrientation = (e) => {
    try {
      if (e.beta === null || e.gamma === null) return;
      const i = {
        x: e.beta / 90,
        y: e.gamma / 90,
        z: e.alpha ? e.alpha / 360 : 0
      };
      this.callback(i);
    } catch (i) {
      console.error("Error handling device orientation:", i);
    }
  };
  cleanup() {
    this.isListening && (this.useMotionAPI ? window.removeEventListener("devicemotion", this.handleMotion) : window.removeEventListener("deviceorientation", this.handleOrientation), this.isListening = !1);
  }
};
export {
  r as DeviceMotion
};

//# sourceMappingURL=DeviceMotion.js.map
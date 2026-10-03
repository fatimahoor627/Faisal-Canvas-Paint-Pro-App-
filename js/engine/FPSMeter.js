/**
 * Canvas Paint Pro - Real-time Render FPS Meter
 * Measures canvas rendering frames per second for production studio performance
 */

export class FPSMeter {
  constructor(statusElementId = 'status-fps') {
    this.el = document.getElementById(statusElementId);
    this.frames = 0;
    this.lastTime = performance.now();
    this.fps = 60;
    this.isRunning = false;
  }

  start() {
    this.isRunning = true;
    const loop = (now) => {
      if (!this.isRunning) return;
      this.frames++;
      const delta = now - this.lastTime;
      if (delta >= 1000) {
        this.fps = Math.round((this.frames * 1000) / delta);
        this.frames = 0;
        this.lastTime = now;
        if (this.el) {
          this.el.textContent = `${this.fps} FPS`;
          this.el.style.color = this.fps >= 50 ? '#10b981' : (this.fps >= 30 ? '#f59e0b' : '#ef4444');
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
  }
}

/**
 * Canvas Paint Pro - Viewport Controller
 * Manages Pan, Zoom, Coordinate conversions, and centering
 */

export class Viewport {
  constructor(stageEl, wrapperEl, options = {}) {
    this.stage = stageEl;
    this.wrapper = wrapperEl;
    this.width = options.width || 1920;
    this.height = options.height || 1080;

    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;

    this.isPanning = false;
    this.spacePressed = false;
    this.startPan = { x: 0, y: 0 };

    this.onTransformChange = null;

    this.init();
  }

  init() {
    this.setCanvasSize(this.width, this.height);
    this.centerInViewport();
    this.bindEvents();
  }

  setCanvasSize(w, h) {
    this.width = Math.max(10, Math.round(w));
    this.height = Math.max(10, Math.round(h));
    this.wrapper.style.width = `${this.width}px`;
    this.wrapper.style.height = `${this.height}px`;
    this.updateTransform();
  }

  centerInViewport() {
    const stageRect = this.stage.getBoundingClientRect();
    const availableW = stageRect.width - 60;
    const availableH = stageRect.height - 60;

    // Calculate best fit zoom
    const fitZoom = Math.min(availableW / this.width, availableH / this.height, 1);
    this.zoom = Math.max(0.1, Math.min(fitZoom, 1));

    // Center canvas in stage
    this.panX = (stageRect.width - this.width * this.zoom) / 2;
    this.panY = (stageRect.height - this.height * this.zoom) / 2;

    this.updateTransform();
  }

  resetZoom100() {
    const stageRect = this.stage.getBoundingClientRect();
    this.zoom = 1;
    this.panX = (stageRect.width - this.width) / 2;
    this.panY = (stageRect.height - this.height) / 2;
    this.updateTransform();
  }

  setZoom(newZoom, centerX = null, centerY = null) {
    const clampedZoom = Math.max(0.05, Math.min(10, newZoom));
    if (clampedZoom === this.zoom) return;

    if (centerX === null || centerY === null) {
      const stageRect = this.stage.getBoundingClientRect();
      centerX = stageRect.width / 2;
      centerY = stageRect.height / 2;
    }

    // Zoom centered around the point (centerX, centerY)
    const factor = clampedZoom / this.zoom;
    this.panX = centerX - (centerX - this.panX) * factor;
    this.panY = centerY - (centerY - this.panY) * factor;
    this.zoom = clampedZoom;

    this.updateTransform();
  }

  zoomIn() {
    this.setZoom(this.zoom * 1.25);
  }

  zoomOut() {
    this.setZoom(this.zoom / 1.25);
  }

  updateTransform() {
    this.wrapper.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    if (this.onTransformChange) {
      this.onTransformChange({
        zoom: this.zoom,
        panX: this.panX,
        panY: this.panY,
        width: this.width,
        height: this.height
      });
    }
  }

  screenToCanvas(clientX, clientY) {
    const stageRect = this.stage.getBoundingClientRect();
    const stageX = clientX - stageRect.left;
    const stageY = clientY - stageRect.top;

    const canvasX = (stageX - this.panX) / this.zoom;
    const canvasY = (stageY - this.panY) / this.zoom;

    return {
      x: Math.round(canvasX),
      y: Math.round(canvasY),
      inBounds: canvasX >= 0 && canvasX <= this.width && canvasY >= 0 && canvasY <= this.height
    };
  }

  canvasToScreen(canvasX, canvasY) {
    const stageRect = this.stage.getBoundingClientRect();
    return {
      x: stageRect.left + this.panX + canvasX * this.zoom,
      y: stageRect.top + this.panY + canvasY * this.zoom
    };
  }

  bindEvents() {
    // Wheel zoom & pan
    this.stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const stageRect = this.stage.getBoundingClientRect();
      const mouseX = e.clientX - stageRect.left;
      const mouseY = e.clientY - stageRect.top;

      if (e.ctrlKey || e.metaKey) {
        // Pinch / Ctrl + Wheel Zoom
        const zoomDelta = e.deltaY < 0 ? 1.15 : 0.85;
        this.setZoom(this.zoom * zoomDelta, mouseX, mouseY);
      } else {
        // Standard Scroll Pan
        this.panX -= e.deltaX;
        this.panY -= e.deltaY;
        this.updateTransform();
      }
    }, { passive: false });

    // Keyboard Space for quick Pan
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.spacePressed && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        this.spacePressed = true;
        this.stage.classList.add('panning');
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.spacePressed = false;
        if (!this.isPanning) {
          this.stage.classList.remove('panning');
        }
      }
    });

    // Window resize
    window.addEventListener('resize', () => {
      this.updateTransform();
    });
  }
}

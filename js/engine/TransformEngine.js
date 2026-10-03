/**
 * Canvas Paint Pro - Photoshop Move & Free Transform Engine
 * Handles Free Transform, Bounding Box with 8 Resize Handles, and Rotation Handle
 */

export class TransformEngine {
  constructor(overlayCanvas, layerManager, historyManager, viewport) {
    this.overlayCanvas = overlayCanvas;
    this.overlayCtx = overlayCanvas.getContext('2d');
    this.layerManager = layerManager;
    this.historyManager = historyManager;
    this.viewport = viewport;

    this.isTransforming = false;
    this.sourceCanvas = null; // Snapshot of layer content being transformed
    this.targetLayer = null;

    // Transform Matrix State
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.rotation = 0; // in radians
    this.scaleX = 1;
    this.scaleY = 1;

    // Handle interaction state
    this.activeHandle = null; // 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'rot', 'move'
    this.dragStart = { x: 0, y: 0 };
    this.initialTransform = {};

    this.handleSize = 8;
  }

  startTransform(layer = null) {
    const target = layer || this.layerManager.getActiveLayer();
    if (!target || target.locked) return false;

    this.targetLayer = target;

    // Calculate content bounding box
    const bbox = this.calculateContentBounds(target);
    if (!bbox) {
      alert('Layer is empty. Nothing to transform.');
      return false;
    }

    this.x = bbox.x;
    this.y = bbox.y;
    this.width = bbox.w;
    this.height = bbox.h;
    this.rotation = 0;
    this.scaleX = 1;
    this.scaleY = 1;

    // Copy source content to offscreen canvas
    this.sourceCanvas = document.createElement('canvas');
    this.sourceCanvas.width = bbox.w;
    this.sourceCanvas.height = bbox.h;
    const sCtx = this.sourceCanvas.getContext('2d');
    sCtx.drawImage(target.canvas, bbox.x, bbox.y, bbox.w, bbox.h, 0, 0, bbox.w, bbox.h);

    // Clear the content from target layer while transforming (so user sees live preview)
    target.ctx.clearRect(bbox.x, bbox.y, bbox.w, bbox.h);
    this.layerManager.notify();

    this.isTransforming = true;
    this.render();
    return true;
  }

  calculateContentBounds(layer) {
    const w = this.layerManager.width;
    const h = this.layerManager.height;
    const imgData = layer.ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    let minX = w, minY = h, maxX = -1, maxY = -1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = d[(y * w + x) * 4 + 3];
        if (a > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX === -1) return null; // Empty
    return {
      x: minX,
      y: minY,
      w: Math.max(10, maxX - minX + 1),
      h: Math.max(10, maxY - minY + 1)
    };
  }

  hitTest(canvasX, canvasY) {
    if (!this.isTransforming) return null;

    const handles = this.getHandleCoordinates();
    const hitRadius = (this.handleSize / this.viewport.zoom) + 4;

    // Check Rotation Handle first
    if (this.distance(canvasX, canvasY, handles.rot.x, handles.rot.y) <= hitRadius) {
      return 'rot';
    }

    // Check Resize Handles
    for (const key of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
      if (this.distance(canvasX, canvasY, handles[key].x, handles[key].y) <= hitRadius) {
        return key;
      }
    }

    // Check Inside Bounding Box for Move
    if (canvasX >= this.x && canvasX <= this.x + this.width &&
        canvasY >= this.y && canvasY <= this.y + this.height) {
      return 'move';
    }

    return null;
  }

  onPointerDown(canvasX, canvasY, e) {
    const handle = this.hitTest(canvasX, canvasY);
    if (!handle) return false;

    this.activeHandle = handle;
    this.dragStart = { x: canvasX, y: canvasY };
    this.initialTransform = {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      rotation: this.rotation
    };

    return true;
  }

  onPointerMove(canvasX, canvasY, shiftKey = false) {
    if (!this.isTransforming || !this.activeHandle) return;

    const dx = canvasX - this.dragStart.x;
    const dy = canvasY - this.dragStart.y;
    const init = this.initialTransform;

    if (this.activeHandle === 'move') {
      this.x = init.x + dx;
      this.y = init.y + dy;
    } else if (this.activeHandle === 'rot') {
      const cx = this.x + this.width / 2;
      const cy = this.y + this.height / 2;
      this.rotation = Math.atan2(canvasY - cy, canvasX - cx) + Math.PI / 2;
    } else {
      // Resize Handles
      let newW = init.width;
      let newH = init.height;
      let newX = init.x;
      let newY = init.y;

      if (this.activeHandle.includes('e')) newW = Math.max(10, init.width + dx);
      if (this.activeHandle.includes('s')) newH = Math.max(10, init.height + dy);
      if (this.activeHandle.includes('w')) {
        const potentialW = init.width - dx;
        if (potentialW > 10) {
          newW = potentialW;
          newX = init.x + dx;
        }
      }
      if (this.activeHandle.includes('n')) {
        const potentialH = init.height - dy;
        if (potentialH > 10) {
          newH = potentialH;
          newY = init.y + dy;
        }
      }

      // Proportional scaling if Shift is held
      if (shiftKey && ['nw', 'ne', 'se', 'sw'].includes(this.activeHandle)) {
        const ratio = init.width / init.height;
        newH = newW / ratio;
      }

      this.x = newX;
      this.y = newY;
      this.width = newW;
      this.height = newH;
    }

    this.render();
  }

  onPointerUp() {
    this.activeHandle = null;
  }

  applyTransform() {
    if (!this.isTransforming || !this.targetLayer) return;

    const ctx = this.targetLayer.ctx;
    ctx.save();
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    ctx.translate(cx, cy);
    ctx.rotate(this.rotation);
    ctx.drawImage(this.sourceCanvas, -this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();

    this.isTransforming = false;
    this.sourceCanvas = null;
    this.activeHandle = null;

    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    this.layerManager.notify();
    this.historyManager.pushState('Free Transform', () => this.layerManager.createSnapshot());
  }

  cancelTransform() {
    if (!this.isTransforming || !this.targetLayer) return;

    // Restore original pixels back to original location
    const init = this.initialTransform;
    this.targetLayer.ctx.drawImage(this.sourceCanvas, init.x, init.y);

    this.isTransforming = false;
    this.sourceCanvas = null;
    this.activeHandle = null;

    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    this.layerManager.notify();
  }

  render() {
    if (!this.isTransforming) return;

    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    this.overlayCtx.save();

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    // 1. Draw Transformed Content Preview
    this.overlayCtx.translate(cx, cy);
    this.overlayCtx.rotate(this.rotation);
    this.overlayCtx.drawImage(this.sourceCanvas, -this.width / 2, -this.height / 2, this.width, this.height);

    // 2. Draw Bounding Box Outline
    this.overlayCtx.strokeStyle = '#3b82f6';
    this.overlayCtx.lineWidth = 1.5 / this.viewport.zoom;
    this.overlayCtx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);

    // 3. Draw Rotation Arm & Handle
    const rotDist = 24 / this.viewport.zoom;
    this.overlayCtx.beginPath();
    this.overlayCtx.moveTo(0, -this.height / 2);
    this.overlayCtx.lineTo(0, -this.height / 2 - rotDist);
    this.overlayCtx.stroke();

    this.drawCircleHandle(this.overlayCtx, 0, -this.height / 2 - rotDist);

    // 4. Draw 8 Anchor Handles
    const hw = this.width / 2;
    const hh = this.height / 2;

    this.drawSquareHandle(this.overlayCtx, -hw, -hh); // NW
    this.drawSquareHandle(this.overlayCtx, 0, -hh);   // N
    this.drawSquareHandle(this.overlayCtx, hw, -hh);  // NE
    this.drawSquareHandle(this.overlayCtx, hw, 0);    // E
    this.drawSquareHandle(this.overlayCtx, hw, hh);   // SE
    this.drawSquareHandle(this.overlayCtx, 0, hh);    // S
    this.drawSquareHandle(this.overlayCtx, -hw, hh);  // SW
    this.drawSquareHandle(this.overlayCtx, -hw, 0);   // W

    this.overlayCtx.restore();
  }

  drawSquareHandle(ctx, x, y) {
    const s = this.handleSize / this.viewport.zoom;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5 / this.viewport.zoom;
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
    ctx.strokeRect(x - s / 2, y - s / 2, s, s);
  }

  drawCircleHandle(ctx, x, y) {
    const r = (this.handleSize / 2 + 1) / this.viewport.zoom;
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 / this.viewport.zoom;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  getHandleCoordinates() {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const hw = this.width / 2;
    const hh = this.height / 2;
    const rotDist = 24 / this.viewport.zoom;

    const rotPoint = (px, py) => {
      const cos = Math.cos(this.rotation);
      const sin = Math.sin(this.rotation);
      return {
        x: cx + px * cos - py * sin,
        y: cy + px * sin + py * cos
      };
    };

    return {
      rot: rotPoint(0, -hh - rotDist),
      nw: rotPoint(-hw, -hh),
      n: rotPoint(0, -hh),
      ne: rotPoint(hw, -hh),
      e: rotPoint(hw, 0),
      se: rotPoint(hw, hh),
      s: rotPoint(0, hh),
      sw: rotPoint(-hw, hh),
      w: rotPoint(-hw, 0)
    };
  }

  distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }
}

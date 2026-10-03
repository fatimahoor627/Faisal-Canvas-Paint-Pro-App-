/**
 * Canvas Paint Pro - Photoshop Advanced Selection Engine
 * Handles:
 * - Rectangular & Elliptical Marquee
 * - Freehand, Polygonal, and Magnetic Lasso Tools
 * - Quick Selection Tool & Magic Wand (Tolerance & Contiguous toggle)
 * - Marching Ants, Copy, Cut, Paste, Invert, Feather, Clear
 */

export class SelectionEngine {
  constructor(overlayCanvas, layerManager, historyManager, viewport) {
    this.overlayCanvas = overlayCanvas;
    this.overlayCtx = overlayCanvas.getContext('2d');
    this.layerManager = layerManager;
    this.historyManager = historyManager;
    this.viewport = viewport;

    this.activeType = null; // 'marquee', 'marquee-ellipse', 'lasso', 'poly-lasso', 'magnetic-lasso', 'quick-select', 'wand'
    this.hasSelection = false;
    this.selectionMask = null;
    this.selectionBounds = null;
    this.clipboardData = null;

    // Tolerance & Contiguous
    this.tolerance = 32;
    this.contiguous = true;

    // In-progress points
    this.isSelecting = false;
    this.startPoint = { x: 0, y: 0 };
    this.currentPoint = { x: 0, y: 0 };
    this.lassoPath = [];
    this.polyPoints = [];

    this.marchingAntsOffset = 0;
    this.antsTimer = null;
    this.startMarchingAnts();
  }

  startMarchingAnts() {
    const loop = () => {
      if (this.hasSelection && !this.isSelecting) {
        this.marchingAntsOffset = (this.marchingAntsOffset + 0.5) % 8;
        this.drawSelectionOutline();
      }
      this.antsTimer = requestAnimationFrame(loop);
    };
    this.antsTimer = requestAnimationFrame(loop);
  }

  startSelection(type, x, y) {
    this.activeType = type;
    this.isSelecting = true;
    this.startPoint = { x, y };
    this.currentPoint = { x, y };

    if (type === 'poly-lasso') {
      if (this.polyPoints.length === 0) {
        this.polyPoints.push({ x, y });
      } else {
        // Check if clicked close to start point to close polygon
        const p0 = this.polyPoints[0];
        if (Math.hypot(x - p0.x, y - p0.y) < 15 && this.polyPoints.length >= 3) {
          this.finishPolyLasso();
          return;
        }
        this.polyPoints.push({ x, y });
      }
      this.drawPreview();
      return;
    }

    this.lassoPath = [{ x, y }];
  }

  updateSelection(x, y) {
    if (!this.isSelecting) return;
    this.currentPoint = { x, y };

    if (this.activeType === 'lasso') {
      this.lassoPath.push({ x, y });
    } else if (this.activeType === 'magnetic-lasso') {
      // Snap to high contrast edge
      const snapped = this.findNearestEdge(x, y);
      this.lassoPath.push(snapped);
    } else if (this.activeType === 'quick-select') {
      // Paint selection brush
      this.paintQuickSelection(x, y, 20);
    }

    this.drawPreview();
  }

  finishSelection(x, y) {
    if (!this.isSelecting || this.activeType === 'poly-lasso') return;
    this.isSelecting = false;
    this.currentPoint = { x, y };

    const w = this.layerManager.width;
    const h = this.layerManager.height;
    const mask = document.createElement('canvas');
    mask.width = w;
    mask.height = h;
    const mCtx = mask.getContext('2d');
    mCtx.fillStyle = '#ffffff';

    const sx = Math.min(this.startPoint.x, x);
    const sy = Math.min(this.startPoint.y, y);
    const sw = Math.abs(x - this.startPoint.x);
    const sh = Math.abs(y - this.startPoint.y);

    if (this.activeType === 'marquee') {
      if (sw < 3 || sh < 3) { this.deselect(); return; }
      mCtx.fillRect(sx, sy, sw, sh);
      this.selectionBounds = { x: sx, y: sy, w: sw, h: sh };
      this.hasSelection = true;
    } else if (this.activeType === 'marquee-ellipse') {
      if (sw < 3 || sh < 3) { this.deselect(); return; }
      mCtx.beginPath();
      mCtx.ellipse(sx + sw / 2, sy + sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2);
      mCtx.fill();
      this.selectionBounds = { x: sx, y: sy, w: sw, h: sh };
      this.hasSelection = true;
    } else if (this.activeType === 'lasso' || this.activeType === 'magnetic-lasso') {
      if (this.lassoPath.length < 3) { this.deselect(); return; }
      mCtx.beginPath();
      mCtx.moveTo(this.lassoPath[0].x, this.lassoPath[0].y);
      for (let i = 1; i < this.lassoPath.length; i++) {
        mCtx.lineTo(this.lassoPath[i].x, this.lassoPath[i].y);
      }
      mCtx.closePath();
      mCtx.fill();

      let minX = w, minY = h, maxX = 0, maxY = 0;
      this.lassoPath.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
      this.selectionBounds = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
      this.hasSelection = true;
    }

    if (this.activeType !== 'quick-select') {
      this.selectionMask = mask;
    }
    this.drawSelectionOutline();
  }

  finishPolyLasso() {
    this.isSelecting = false;
    const w = this.layerManager.width;
    const h = this.layerManager.height;
    const mask = document.createElement('canvas');
    mask.width = w;
    mask.height = h;
    const mCtx = mask.getContext('2d');
    mCtx.fillStyle = '#ffffff';

    mCtx.beginPath();
    mCtx.moveTo(this.polyPoints[0].x, this.polyPoints[0].y);
    for (let i = 1; i < this.polyPoints.length; i++) {
      mCtx.lineTo(this.polyPoints[i].x, this.polyPoints[i].y);
    }
    mCtx.closePath();
    mCtx.fill();

    let minX = w, minY = h, maxX = 0, maxY = 0;
    this.polyPoints.forEach(p => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });

    this.selectionMask = mask;
    this.selectionBounds = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    this.hasSelection = true;
    this.polyPoints = [];
    this.drawSelectionOutline();
  }

  // Edge detection for Magnetic Lasso
  findNearestEdge(x, y) {
    const active = this.layerManager.getActiveLayer();
    if (!active) return { x, y };

    const searchRadius = 6;
    const w = this.layerManager.width;
    const h = this.layerManager.height;
    const left = Math.max(0, x - searchRadius);
    const top = Math.max(0, y - searchRadius);
    const sw = Math.min(w - left, searchRadius * 2);
    const sh = Math.min(h - top, searchRadius * 2);

    if (sw <= 0 || sh <= 0) return { x, y };

    const d = active.ctx.getImageData(left, top, sw, sh).data;
    let maxGrad = -1;
    let bestX = x, bestY = y;

    for (let py = 1; py < sh - 1; py++) {
      for (let px = 1; px < sw - 1; px++) {
        const idx = (py * sw + px) * 4;
        const rightIdx = (py * sw + (px + 1)) * 4;
        const botIdx = ((py + 1) * sw + px) * 4;

        const gx = Math.abs(d[idx] - d[rightIdx]) + Math.abs(d[idx + 1] - d[rightIdx + 1]);
        const gy = Math.abs(d[idx] - d[botIdx]) + Math.abs(d[idx + 1] - d[botIdx + 1]);
        const grad = gx + gy;

        if (grad > maxGrad) {
          maxGrad = grad;
          bestX = left + px;
          bestY = top + py;
        }
      }
    }
    return { x: bestX, y: bestY };
  }

  // Quick Selection brush
  paintQuickSelection(x, y, radius = 20) {
    const w = this.layerManager.width;
    const h = this.layerManager.height;

    if (!this.selectionMask) {
      this.selectionMask = document.createElement('canvas');
      this.selectionMask.width = w;
      this.selectionMask.height = h;
    }

    const mCtx = this.selectionMask.getContext('2d');
    mCtx.fillStyle = '#ffffff';
    mCtx.beginPath();
    mCtx.arc(x, y, radius, 0, Math.PI * 2);
    mCtx.fill();

    this.hasSelection = true;
    if (!this.selectionBounds) {
      this.selectionBounds = { x: x - radius, y: y - radius, w: radius * 2, h: radius * 2 };
    } else {
      const b = this.selectionBounds;
      const nx = Math.min(b.x, x - radius);
      const ny = Math.min(b.y, y - radius);
      const nw = Math.max(b.x + b.w, x + radius) - nx;
      const nh = Math.max(b.y + b.h, y + radius) - ny;
      this.selectionBounds = { x: nx, y: ny, w: nw, h: nh };
    }
  }

  // Magic Wand Tool with Tolerance and Contiguous options
  selectMagicWand(startX, startY, tolerance = 32, contiguous = true) {
    const w = this.layerManager.width;
    const h = this.layerManager.height;
    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    const imgData = activeLayer.ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const startIndex = (startY * w + startX) * 4;
    const sR = data[startIndex];
    const sG = data[startIndex + 1];
    const sB = data[startIndex + 2];
    const sA = data[startIndex + 3];

    const mask = document.createElement('canvas');
    mask.width = w;
    mask.height = h;
    const mCtx = mask.getContext('2d');
    const maskImgData = mCtx.createImageData(w, h);
    const mData = maskImgData.data;

    let minX = startX, maxX = startX, minY = startY, maxY = startY;

    if (!contiguous) {
      // Non-contiguous: select all matching pixels across whole image
      for (let i = 0; i < data.length; i += 4) {
        if (
          Math.abs(data[i] - sR) <= tolerance &&
          Math.abs(data[i + 1] - sG) <= tolerance &&
          Math.abs(data[i + 2] - sB) <= tolerance &&
          Math.abs(data[i + 3] - sA) <= tolerance
        ) {
          mData[i] = 255;
          mData[i + 1] = 255;
          mData[i + 2] = 255;
          mData[i + 3] = 255;

          const px = (i / 4) % w;
          const py = Math.floor((i / 4) / w);
          minX = Math.min(minX, px);
          maxX = Math.max(maxX, px);
          minY = Math.min(minY, py);
          maxY = Math.max(maxY, py);
        }
      }
    } else {
      // Contiguous BFS
      const queue = [startX, startY];
      const visited = new Uint8Array(w * h);
      visited[startY * w + startX] = 1;

      let head = 0;
      while (head < queue.length) {
        const cx = queue[head++];
        const cy = queue[head++];
        const idx = (cy * w + cx) * 4;

        mData[idx] = 255;
        mData[idx + 1] = 255;
        mData[idx + 2] = 255;
        mData[idx + 3] = 255;

        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);

        const neighbors = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
        for (let i = 0; i < 4; i++) {
          const [nx, ny] = neighbors[i];
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const vIdx = ny * w + nx;
            if (!visited[vIdx]) {
              visited[vIdx] = 1;
              const nIdx = (ny * w + nx) * 4;
              if (
                Math.abs(data[nIdx] - sR) <= tolerance &&
                Math.abs(data[nIdx + 1] - sG) <= tolerance &&
                Math.abs(data[nIdx + 2] - sB) <= tolerance &&
                Math.abs(data[nIdx + 3] - sA) <= tolerance
              ) {
                queue.push(nx, ny);
              }
            }
          }
        }
      }
    }

    mCtx.putImageData(maskImgData, 0, 0);
    this.selectionMask = mask;
    this.selectionBounds = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    this.hasSelection = true;
    this.drawSelectionOutline();
  }

  deselect() {
    this.hasSelection = false;
    this.selectionMask = null;
    this.selectionBounds = null;
    this.polyPoints = [];
    this.lassoPath = [];
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
  }

  selectAll() {
    const w = this.layerManager.width;
    const h = this.layerManager.height;
    const mask = document.createElement('canvas');
    mask.width = w;
    mask.height = h;
    const mCtx = mask.getContext('2d');
    mCtx.fillStyle = '#ffffff';
    mCtx.fillRect(0, 0, w, h);

    this.selectionMask = mask;
    this.selectionBounds = { x: 0, y: 0, w, h };
    this.hasSelection = true;
    this.drawSelectionOutline();
  }

  drawPreview() {
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    this.overlayCtx.save();
    this.overlayCtx.setLineDash([4, 4]);
    this.overlayCtx.strokeStyle = '#ffffff';
    this.overlayCtx.lineWidth = 1;

    const sx = Math.min(this.startPoint.x, this.currentPoint.x);
    const sy = Math.min(this.startPoint.y, this.currentPoint.y);
    const sw = Math.abs(this.currentPoint.x - this.startPoint.x);
    const sh = Math.abs(this.currentPoint.y - this.startPoint.y);

    if (this.activeType === 'marquee') {
      this.overlayCtx.strokeRect(sx, sy, sw, sh);
    } else if (this.activeType === 'marquee-ellipse') {
      this.overlayCtx.beginPath();
      this.overlayCtx.ellipse(sx + sw / 2, sy + sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2);
      this.overlayCtx.stroke();
    } else if (this.activeType === 'lasso' || this.activeType === 'magnetic-lasso') {
      this.overlayCtx.beginPath();
      this.overlayCtx.moveTo(this.lassoPath[0].x, this.lassoPath[0].y);
      for (let i = 1; i < this.lassoPath.length; i++) {
        this.overlayCtx.lineTo(this.lassoPath[i].x, this.lassoPath[i].y);
      }
      this.overlayCtx.stroke();
    } else if (this.activeType === 'poly-lasso') {
      if (this.polyPoints.length > 0) {
        this.overlayCtx.beginPath();
        this.overlayCtx.moveTo(this.polyPoints[0].x, this.polyPoints[0].y);
        for (let i = 1; i < this.polyPoints.length; i++) {
          this.overlayCtx.lineTo(this.polyPoints[i].x, this.polyPoints[i].y);
        }
        this.overlayCtx.lineTo(this.currentPoint.x, this.currentPoint.y);
        this.overlayCtx.stroke();
      }
    }
    this.overlayCtx.restore();
  }

  drawSelectionOutline() {
    if (!this.hasSelection || !this.selectionBounds) return;
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    this.overlayCtx.save();

    const { x, y, w, h } = this.selectionBounds;

    this.overlayCtx.setLineDash([4, 4]);
    this.overlayCtx.lineDashOffset = -this.marchingAntsOffset;
    this.overlayCtx.strokeStyle = '#000000';
    this.overlayCtx.lineWidth = 1.5;
    this.overlayCtx.strokeRect(x, y, w, h);

    this.overlayCtx.strokeStyle = '#ffffff';
    this.overlayCtx.lineDashOffset = -this.marchingAntsOffset + 4;
    this.overlayCtx.strokeRect(x, y, w, h);

    this.overlayCtx.restore();
  }

  copySelection() {
    if (!this.hasSelection || !this.selectionMask) return false;
    const layer = this.layerManager.getActiveLayer();
    if (!layer) return false;

    const b = this.selectionBounds;
    const clipCanvas = document.createElement('canvas');
    clipCanvas.width = b.w;
    clipCanvas.height = b.h;
    const cCtx = clipCanvas.getContext('2d');

    cCtx.drawImage(this.selectionMask, -b.x, -b.y);
    cCtx.globalCompositeOperation = 'source-in';
    cCtx.drawImage(layer.canvas, -b.x, -b.y);

    this.clipboardData = { canvas: clipCanvas, bounds: { ...b } };
    return true;
  }

  cutSelection() {
    if (!this.copySelection()) return false;
    this.deleteSelectionContent();
    return true;
  }

  pasteSelection() {
    if (!this.clipboardData) return false;
    const newLayer = this.layerManager.addLayer('Pasted Object');
    const { canvas, bounds } = this.clipboardData;
    newLayer.ctx.drawImage(canvas, bounds.x + 20, bounds.y + 20);

    this.layerManager.notify();
    this.historyManager.pushState('Paste Selection', () => this.layerManager.createSnapshot());
    return true;
  }

  deleteSelectionContent() {
    if (!this.hasSelection || !this.selectionMask) return;
    const layer = this.layerManager.getActiveLayer();
    if (!layer || layer.locked) return;

    layer.ctx.save();
    layer.ctx.globalCompositeOperation = 'destination-out';
    layer.ctx.drawImage(this.selectionMask, 0, 0);
    layer.ctx.restore();

    this.layerManager.notify();
    this.historyManager.pushState('Clear Selection Area', () => this.layerManager.createSnapshot());
  }

  invertSelection() {
    if (!this.hasSelection || !this.selectionMask) return;
    const w = this.layerManager.width;
    const h = this.layerManager.height;

    const newMask = document.createElement('canvas');
    newMask.width = w;
    newMask.height = h;
    const nCtx = newMask.getContext('2d');
    nCtx.fillStyle = '#ffffff';
    nCtx.fillRect(0, 0, w, h);
    nCtx.globalCompositeOperation = 'destination-out';
    nCtx.drawImage(this.selectionMask, 0, 0);

    this.selectionMask = newMask;
    this.selectionBounds = { x: 0, y: 0, w, h };
    this.drawSelectionOutline();
  }
}

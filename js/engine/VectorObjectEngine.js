/**
 * Canvas Paint Pro - MS Word & Canva Vector Object Engine
 * Handles Rich Text Elements, Draggable Stickers/Badges, Asset Library, and Smart Alignment Guides
 */

export class VectorObjectEngine {
  constructor(overlayCanvas, layerManager, historyManager, viewport) {
    this.overlayCanvas = overlayCanvas;
    this.overlayCtx = overlayCanvas.getContext('2d');
    this.layerManager = layerManager;
    this.historyManager = historyManager;
    this.viewport = viewport;

    this.objects = [];
    this.selectedObjectId = null;

    // Smart Guides
    this.guides = { x: null, y: null };
    this.snapThreshold = 8; // pixels

    // Interaction State
    this.activeAction = null; // 'drag', 'resize', 'rotate'
    this.activeHandle = null;
    this.dragStart = { x: 0, y: 0 };
    this.objInitial = null;

    this.onSelectionChange = null;
    this.onObjectModified = null;
  }

  // ==========================================
  // OBJECT CREATION & ASSET LIBRARY
  // ==========================================

  addTextObject(text = 'Double-click to edit text', options = {}) {
    const id = `text-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const obj = {
      id,
      type: 'text',
      text,
      x: options.x !== undefined ? options.x : this.layerManager.width / 2 - 150,
      y: options.y !== undefined ? options.y : this.layerManager.height / 2 - 40,
      width: options.width || 320,
      height: options.height || 80,
      rotation: 0,
      fontFamily: options.fontFamily || 'Inter',
      fontSize: options.fontSize || 36,
      fontWeight: options.fontWeight || '600',
      fontStyle: options.fontStyle || 'normal',
      textDecoration: options.textDecoration || 'none',
      textAlign: options.textAlign || 'center',
      color: options.color || '#3b82f6',
      backgroundColor: options.backgroundColor || 'transparent',
      opacity: 1.0
    };

    this.objects.push(obj);
    this.selectObject(id);
    this.render();
    this.recordHistory('Add Text');
    return obj;
  }

  addShapeObject(shapeType, options = {}) {
    const id = `shape-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const obj = {
      id,
      type: 'shape',
      shapeType, // 'badge', 'star', 'heart', 'cloud', 'callout', 'arrow-right'
      x: options.x !== undefined ? options.x : this.layerManager.width / 2 - 80,
      y: options.y !== undefined ? options.y : this.layerManager.height / 2 - 80,
      width: options.width || 160,
      height: options.height || 160,
      rotation: 0,
      fillColor: options.fillColor || '#3b82f6',
      strokeColor: options.strokeColor || '#ffffff',
      strokeWidth: options.strokeWidth || 4,
      opacity: 1.0
    };

    this.objects.push(obj);
    this.selectObject(id);
    this.render();
    this.recordHistory(`Add ${shapeType}`);
    return obj;
  }

  addStickerObject(svgOrEmoji, options = {}) {
    const id = `sticker-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const obj = {
      id,
      type: 'sticker',
      content: svgOrEmoji,
      x: options.x !== undefined ? options.x : this.layerManager.width / 2 - 50,
      y: options.y !== undefined ? options.y : this.layerManager.height / 2 - 50,
      width: options.width || 100,
      height: options.height || 100,
      rotation: 0,
      opacity: 1.0
    };

    this.objects.push(obj);
    this.selectObject(id);
    this.render();
    this.recordHistory('Add Sticker');
    return obj;
  }

  // ==========================================
  // SELECTION & MANIPULATION
  // ==========================================

  selectObject(id) {
    this.selectedObjectId = id;
    if (this.onSelectionChange) {
      this.onSelectionChange(this.getSelectedObject());
    }
    this.render();
  }

  deselect() {
    this.selectedObjectId = null;
    if (this.onSelectionChange) this.onSelectionChange(null);
    this.render();
  }

  getSelectedObject() {
    return this.objects.find(o => o.id === this.selectedObjectId) || null;
  }

  deleteSelected() {
    const idx = this.objects.findIndex(o => o.id === this.selectedObjectId);
    if (idx !== -1) {
      this.objects.splice(idx, 1);
      this.selectedObjectId = null;
      this.render();
      this.recordHistory('Delete Object');
      if (this.onSelectionChange) this.onSelectionChange(null);
    }
  }

  bringToFront() {
    const obj = this.getSelectedObject();
    if (!obj) return;
    const idx = this.objects.indexOf(obj);
    this.objects.splice(idx, 1);
    this.objects.push(obj);
    this.render();
  }

  sendToBack() {
    const obj = this.getSelectedObject();
    if (!obj) return;
    const idx = this.objects.indexOf(obj);
    this.objects.splice(idx, 1);
    this.objects.unshift(obj);
    this.render();
  }

  // Burn / Rasterize all vector objects onto the active raster layer
  burnToActiveLayer() {
    const layer = this.layerManager.getActiveLayer();
    if (!layer || layer.locked || this.objects.length === 0) return;

    this.objects.forEach(obj => this.drawObject(layer.ctx, obj));
    this.objects = [];
    this.selectedObjectId = null;
    this.layerManager.notify();
    this.recordHistory('Flatten Vector Objects');
    this.render();
  }

  // ==========================================
  // HIT TESTING & INTERACTION
  // ==========================================

  hitTest(x, y) {
    // Check handles of selected object first
    const selected = this.getSelectedObject();
    if (selected) {
      const handles = this.getHandles(selected);
      const hitRadius = 10 / this.viewport.zoom;

      if (this.distance(x, y, handles.rot.x, handles.rot.y) <= hitRadius) return { type: 'handle', handle: 'rot', obj: selected };
      for (const h of ['nw', 'ne', 'se', 'sw']) {
        if (this.distance(x, y, handles[h].x, handles[h].y) <= hitRadius) {
          return { type: 'handle', handle: h, obj: selected };
        }
      }
    }

    // Check objects in reverse (top to bottom)
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      if (x >= obj.x && x <= obj.x + obj.width && y >= obj.y && y <= obj.y + obj.height) {
        return { type: 'object', obj };
      }
    }

    return null;
  }

  onPointerDown(canvasX, canvasY) {
    const hit = this.hitTest(canvasX, canvasY);

    if (!hit) {
      this.deselect();
      return false;
    }

    if (hit.type === 'handle') {
      this.activeAction = hit.handle === 'rot' ? 'rotate' : 'resize';
      this.activeHandle = hit.handle;
      this.dragStart = { x: canvasX, y: canvasY };
      this.objInitial = { ...hit.obj };
      return true;
    }

    if (hit.type === 'object') {
      this.selectObject(hit.obj.id);
      this.activeAction = 'drag';
      this.dragStart = { x: canvasX, y: canvasY };
      this.objInitial = { ...hit.obj };
      return true;
    }

    return false;
  }

  onPointerMove(canvasX, canvasY, shiftKey = false) {
    if (!this.activeAction || !this.selectedObjectId) return;

    const obj = this.getSelectedObject();
    if (!obj) return;

    const dx = canvasX - this.dragStart.x;
    const dy = canvasY - this.dragStart.y;
    const init = this.objInitial;

    this.guides = { x: null, y: null };

    if (this.activeAction === 'drag') {
      let nextX = init.x + dx;
      let nextY = init.y + dy;

      // Smart Snap to Canvas Center & Edges
      const canvasMidX = this.layerManager.width / 2;
      const canvasMidY = this.layerManager.height / 2;
      const objMidX = nextX + obj.width / 2;
      const objMidY = nextY + obj.height / 2;

      // Snap X Center
      if (Math.abs(objMidX - canvasMidX) < this.snapThreshold) {
        nextX = canvasMidX - obj.width / 2;
        this.guides.x = canvasMidX;
      }
      // Snap Y Center
      if (Math.abs(objMidY - canvasMidY) < this.snapThreshold) {
        nextY = canvasMidY - obj.height / 2;
        this.guides.y = canvasMidY;
      }

      obj.x = nextX;
      obj.y = nextY;
    } else if (this.activeAction === 'rotate') {
      const cx = obj.x + obj.width / 2;
      const cy = obj.y + obj.height / 2;
      obj.rotation = Math.atan2(canvasY - cy, canvasX - cx) + Math.PI / 2;
    } else if (this.activeAction === 'resize') {
      let newW = init.width;
      let newH = init.height;
      let newX = init.x;
      let newY = init.y;

      if (this.activeHandle.includes('e')) newW = Math.max(20, init.width + dx);
      if (this.activeHandle.includes('s')) newH = Math.max(20, init.height + dy);
      if (this.activeHandle.includes('w')) {
        const pW = init.width - dx;
        if (pW > 20) { newW = pW; newX = init.x + dx; }
      }
      if (this.activeHandle.includes('n')) {
        const pH = init.height - dy;
        if (pH > 20) { newH = pH; newY = init.y + dy; }
      }

      if (shiftKey) {
        const ratio = init.width / init.height;
        newH = newW / ratio;
      }

      obj.x = newX;
      obj.y = newY;
      obj.width = newW;
      obj.height = newH;
    }

    this.render();
  }

  onPointerUp() {
    if (this.activeAction) {
      this.recordHistory('Transform Vector Object');
      this.activeAction = null;
      this.guides = { x: null, y: null };
      this.render();
      if (this.onObjectModified) this.onObjectModified(this.getSelectedObject());
    }
  }

  // ==========================================
  // RENDERING ENGINE
  // ==========================================

  render() {
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

    // 1. Draw all vector objects
    this.objects.forEach(obj => {
      this.drawObject(this.overlayCtx, obj);
    });

    // 2. Draw Smart Guides if active
    if (this.guides.x !== null) {
      this.overlayCtx.save();
      this.overlayCtx.strokeStyle = '#ef4444';
      this.overlayCtx.lineWidth = 1 / this.viewport.zoom;
      this.overlayCtx.beginPath();
      this.overlayCtx.moveTo(this.guides.x, 0);
      this.overlayCtx.lineTo(this.guides.x, this.layerManager.height);
      this.overlayCtx.stroke();
      this.overlayCtx.restore();
    }

    if (this.guides.y !== null) {
      this.overlayCtx.save();
      this.overlayCtx.strokeStyle = '#ef4444';
      this.overlayCtx.lineWidth = 1 / this.viewport.zoom;
      this.overlayCtx.beginPath();
      this.overlayCtx.moveTo(0, this.guides.y);
      this.overlayCtx.lineTo(this.layerManager.width, this.guides.y);
      this.overlayCtx.stroke();
      this.overlayCtx.restore();
    }

    // 3. Draw Bounding Box & Handles for Selected Object
    const selected = this.getSelectedObject();
    if (selected) {
      this.drawObjectBoundingBox(this.overlayCtx, selected);
    }
  }

  drawObject(ctx, obj) {
    ctx.save();
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;

    ctx.translate(cx, cy);
    ctx.rotate(obj.rotation || 0);
    ctx.globalAlpha = obj.opacity || 1.0;

    const hw = obj.width / 2;
    const hh = obj.height / 2;

    if (obj.type === 'text') {
      if (obj.backgroundColor && obj.backgroundColor !== 'transparent') {
        ctx.fillStyle = obj.backgroundColor;
        ctx.fillRect(-hw, -hh, obj.width, obj.height);
      }

      ctx.fillStyle = obj.color;
      ctx.font = `${obj.fontStyle || 'normal'} ${obj.fontWeight || 'normal'} ${obj.fontSize || 32}px "${obj.fontFamily || 'Inter'}", sans-serif`;
      ctx.textAlign = obj.textAlign || 'center';
      ctx.textBaseline = 'middle';

      let textX = 0;
      if (obj.textAlign === 'left') textX = -hw + 10;
      if (obj.textAlign === 'right') textX = hw - 10;

      ctx.fillText(obj.text, textX, 0);

      if (obj.textDecoration === 'underline') {
        const metrics = ctx.measureText(obj.text);
        const lineY = (obj.fontSize || 32) * 0.45;
        ctx.strokeStyle = obj.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(textX - metrics.width / 2, lineY);
        ctx.lineTo(textX + metrics.width / 2, lineY);
        ctx.stroke();
      }
    } else if (obj.type === 'shape') {
      ctx.fillStyle = obj.fillColor;
      ctx.strokeStyle = obj.strokeColor;
      ctx.lineWidth = obj.strokeWidth;
      this.drawCustomVectorGeometry(ctx, obj.shapeType, -hw, -hh, obj.width, obj.height);
    } else if (obj.type === 'sticker') {
      ctx.font = `${obj.height * 0.8}px "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(obj.content, 0, 0);
    }

    ctx.restore();
  }

  drawCustomVectorGeometry(ctx, type, x, y, w, h) {
    ctx.beginPath();
    if (type === 'badge') {
      // 8-point ribbon badge
      const points = 12;
      const outer = Math.min(w, h) / 2;
      const inner = outer * 0.85;
      for (let i = 0; i < points * 2; i++) {
        const r = (i % 2 === 0) ? outer : inner;
        const a = (i * Math.PI) / points;
        const px = x + w / 2 + Math.cos(a) * r;
        const py = y + h / 2 + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (type === 'heart') {
      const topY = y + h * 0.3;
      ctx.moveTo(x + w / 2, y + h);
      ctx.bezierCurveTo(x, y + h * 0.7, x, topY, x + w / 4, y);
      ctx.bezierCurveTo(x + w / 2, y, x + w / 2, topY, x + w / 2, topY);
      ctx.bezierCurveTo(x + w / 2, topY, x + w / 2, y, x + w * 0.75, y);
      ctx.bezierCurveTo(x + w, topY, x + w, y + h * 0.7, x + w / 2, y + h);
      ctx.closePath();
    } else if (type === 'arrow-right') {
      ctx.moveTo(x, y + h * 0.3);
      ctx.lineTo(x + w * 0.6, y + h * 0.3);
      ctx.lineTo(x + w * 0.6, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w * 0.6, y + h);
      ctx.lineTo(x + w * 0.6, y + h * 0.7);
      ctx.lineTo(x, y + h * 0.7);
      ctx.closePath();
    } else {
      ctx.rect(x, y, w, h);
    }

    ctx.fill();
    if (ctx.lineWidth > 0) ctx.stroke();
  }

  drawObjectBoundingBox(ctx, obj) {
    ctx.save();
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(obj.rotation || 0);

    const hw = obj.width / 2;
    const hh = obj.height / 2;

    // Outline
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5 / this.viewport.zoom;
    ctx.strokeRect(-hw, -hh, obj.width, obj.height);

    // Rotation Arm & Handle
    const rotDist = 20 / this.viewport.zoom;
    ctx.beginPath();
    ctx.moveTo(0, -hh);
    ctx.lineTo(0, -hh - rotDist);
    ctx.stroke();

    const r = 4 / this.viewport.zoom;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(0, -hh - rotDist, r, 0, Math.PI * 2);
    ctx.fill();

    // Corner Handles
    const s = 7 / this.viewport.zoom;
    ctx.fillStyle = '#ffffff';
    [
      [-hw, -hh],
      [hw, -hh],
      [hw, hh],
      [-hw, hh]
    ].forEach(([hx, hy]) => {
      ctx.fillRect(hx - s / 2, hy - s / 2, s, s);
      ctx.strokeRect(hx - s / 2, hy - s / 2, s, s);
    });

    ctx.restore();
  }

  getHandles(obj) {
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;
    const hw = obj.width / 2;
    const hh = obj.height / 2;
    const rotDist = 20 / this.viewport.zoom;

    const rotPoint = (px, py) => {
      const cos = Math.cos(obj.rotation || 0);
      const sin = Math.sin(obj.rotation || 0);
      return {
        x: cx + px * cos - py * sin,
        y: cy + px * sin + py * cos
      };
    };

    return {
      rot: rotPoint(0, -hh - rotDist),
      nw: rotPoint(-hw, -hh),
      ne: rotPoint(hw, -hh),
      se: rotPoint(hw, hh),
      sw: rotPoint(-hw, hh)
    };
  }

  distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  recordHistory(actionName) {
    this.historyManager.pushState(actionName, () => this.layerManager.createSnapshot());
  }
}

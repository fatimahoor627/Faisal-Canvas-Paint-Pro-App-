/**
 * Canvas Paint Pro - Interactive Tool Engine
 * Handles Move Tool, MS Paint Shapes, Pencil, Brush, Eraser, Flood Fill, Eyedropper, Hand, Zoom,
 * Dynamic Circular Brush Cursor with Caps Lock precision toggle, and Auto-Layer per Action.
 */

export class ToolManager {
  constructor(overlayCanvas, layerManager, viewport, historyManager, paintBrushes = null) {
    this.overlayCanvas = overlayCanvas;
    this.overlayCtx = overlayCanvas.getContext('2d');
    this.layerManager = layerManager;
    this.viewport = viewport;
    this.historyManager = historyManager;
    this.paintBrushes = paintBrushes;

    // Keep the engine in sync with the Move tool that is selected in the
    // initial toolbar markup.
    this.activeTool = 'move';

    // Tool Settings
    this.primaryColor = '#3b82f6';
    this.secondaryColor = '#ffffff';
    this.brushSize = 8;
    this.brushOpacity = 1.0;
    this.brushHardness = 90;

    // Shapes Engine
    this.shapeType = 'rectangle';
    this.shapeFill = true;
    this.shapeStroke = true;
    this.shapeCornerRadius = 24;
    this.shapeStarInnerRatio = 0.5;
    this.shapeCurveBend = 0.4;

    // Move Tool & Auto-Select
    this.autoSelectLayer = true;
    this.isMovingLayer = false;
    this.moveStartPoint = { x: 0, y: 0 };
    this.moveLastPoint = { x: 0, y: 0 };
    this.hasMovedLayer = false;

    // Auto-Layer per Action (Requested: "haar kaam mein khudi jab koi kaam kare oska alag layer add hu jaye")
    this.autoNewLayerMode = true;

    // Caps Lock & Cursor settings
    this.capsLockCrosshair = false;
    this.brushCursorEl = null;

    // Interaction State
    this.isDrawing = false;
    this.isPanning = false;
    this.startPoint = { x: 0, y: 0 };
    this.lastPoint = { x: 0, y: 0 };
    this.points = [];
    this.strokeContextActive = false;

    this.onColorPicked = null;
    this.onToolChange = null;
    this.onStatusUpdate = null;
    this.onLayerAutoCreated = null;

    this.init();
  }

  init() {
    this.resizeOverlay(this.layerManager.width, this.layerManager.height);
    this.initBrushCursor();
    this.bindEvents();
    this.bindKeyboardShortcuts();
  }

  resizeOverlay(w, h) {
    this.overlayCanvas.width = w;
    this.overlayCanvas.height = h;
  }

  initBrushCursor() {
    let cursor = document.getElementById('brush-preview-cursor');
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.id = 'brush-preview-cursor';
      cursor.className = 'brush-preview-cursor';
      document.body.appendChild(cursor);
    }
    this.brushCursorEl = cursor;
  }

  setTool(tool) {
    this.activeTool = tool;
    this.updateCursorStyle();

    if (this.onToolChange) {
      this.onToolChange(tool);
    }
  }

  setPrimaryColor(hex) {
    this.primaryColor = hex;
  }

  setSecondaryColor(hex) {
    this.secondaryColor = hex;
  }

  swapColors() {
    const temp = this.primaryColor;
    this.primaryColor = this.secondaryColor;
    this.secondaryColor = temp;
  }

  resetColors() {
    this.primaryColor = '#000000';
    this.secondaryColor = '#ffffff';
  }

  setAutoNewLayer(enabled) {
    this.autoNewLayerMode = enabled;
  }

  toggleCapsLock(forcedState = null) {
    if (forcedState !== null) {
      this.capsLockCrosshair = forcedState;
    } else {
      this.capsLockCrosshair = !this.capsLockCrosshair;
    }
    this.updateCursorStyle();
    if (this.onStatusUpdate) {
      this.onStatusUpdate(`Brush Cursor: ${this.capsLockCrosshair ? 'Precision Crosshair (+)' : 'Circle Outline (O)'}`);
    }
  }

  updateCursorStyle() {
    const stage = this.viewport.stage;
    const isBrushLike = ['brush', 'pencil', 'eraser', 'clone', 'spot-healing', 'healing-brush', 'dodge', 'burn', 'sponge', 'blur-tool', 'sharpen-tool', 'smudge'].includes(this.activeTool);

    if (this.activeTool === 'move') {
      stage.style.cursor = 'move';
      if (this.brushCursorEl) this.brushCursorEl.style.display = 'none';
    } else if (this.activeTool === 'hand') {
      stage.style.cursor = 'grab';
      if (this.brushCursorEl) this.brushCursorEl.style.display = 'none';
    } else if (this.activeTool === 'zoom') {
      stage.style.cursor = 'zoom-in';
      if (this.brushCursorEl) this.brushCursorEl.style.display = 'none';
    } else if (this.activeTool === 'eyedropper') {
      stage.style.cursor = 'crosshair';
      if (this.brushCursorEl) this.brushCursorEl.style.display = 'none';
    } else if (isBrushLike) {
      if (this.capsLockCrosshair) {
        stage.style.cursor = 'crosshair';
        if (this.brushCursorEl) this.brushCursorEl.style.display = 'none';
      } else {
        stage.style.cursor = 'none';
      }
    } else {
      stage.style.cursor = 'crosshair';
      if (this.brushCursorEl) this.brushCursorEl.style.display = 'none';
    }
  }

  bindEvents() {
    const stage = this.viewport.stage;

    stage.addEventListener('mousedown', (e) => this.onPointerDown(e));
    window.addEventListener('mousemove', (e) => this.onPointerMove(e));
    window.addEventListener('mouseup', (e) => this.onPointerUp(e));

    stage.addEventListener('mouseleave', () => {
      if (this.brushCursorEl) this.brushCursorEl.style.display = 'none';
    });

    stage.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Caps Lock Toggle for Brush Cursor
      if (e.key === 'CapsLock') {
        this.toggleCapsLock();
      }

      // Check if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      // Nudge active layer with arrow keys when Move Tool is active
      if (this.activeTool === 'move') {
        const step = e.shiftKey ? 10 : 1;
        let dx = 0, dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        else if (e.key === 'ArrowDown') dy = step;
        else if (e.key === 'ArrowLeft') dx = -step;
        else if (e.key === 'ArrowRight') dx = step;

        if (dx !== 0 || dy !== 0) {
          e.preventDefault();
          this.layerManager.translateLayer(dx, dy);
          this.recordHistory(`Nudge Layer (${dx}, ${dy})`);
        }
      }
    });
  }

  // ==========================================
  // AUTO-LAYER DISPATCHER
  // ==========================================
  ensureAutoLayer(actionTitle) {
    if (!this.autoNewLayerMode) return;

    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    // If on background or active layer has content, automatically create a new layer!
    const isBg = activeLayer.name.toLowerCase() === 'background';
    const hasContent = !this.layerManager.isLayerEmpty(activeLayer.id);

    if (isBg || hasContent) {
      const newLayer = this.layerManager.addLayer(actionTitle, true);
      if (this.onLayerAutoCreated) {
        this.onLayerAutoCreated(newLayer);
      }
    }
  }

  onPointerDown(e) {
    // Check if middle click or space key is active -> Hand pan
    if (e.button === 1 || this.viewport.spacePressed || this.activeTool === 'hand') {
      this.isPanning = true;
      this.startPoint = { x: e.clientX, y: e.clientY };
      this.viewport.stage.classList.add('is-panning');
      return;
    }

    if (e.button !== 0) return; // Only primary mouse button

    const { x, y, inBounds } = this.viewport.screenToCanvas(e.clientX, e.clientY);

    // ==========================================
    // 1. MOVE TOOL (V) - PHOTOSHOP SPEC
    // ==========================================
    if (this.activeTool === 'move') {
      if (this.autoSelectLayer && inBounds) {
        const hitLayer = this.layerManager.getLayerAtPoint(x, y);
        if (hitLayer) {
          this.layerManager.activeLayerId = hitLayer.id;
          this.layerManager.notify();
        }
      }

      const activeLayer = this.layerManager.getActiveLayer();
      const isBackground = activeLayer && activeLayer.name.toLowerCase() === 'background';
      if (!activeLayer || activeLayer.locked || isBackground) {
        if (this.onStatusUpdate) {
          this.onStatusUpdate(isBackground ? 'Background is fixed. Select a content layer to move it.' : 'Cannot move locked layer.');
        }
        return;
      }

      this.isMovingLayer = true;
      this.moveStartPoint = { x, y };
      this.moveLastPoint = { x, y };
      this.hasMovedLayer = false;
      return;
    }

    // ==========================================
    // 2. ZOOM & EYEDROPPER & BUCKET
    // ==========================================
    if (this.activeTool === 'zoom') {
      if (e.altKey || e.shiftKey) {
        this.viewport.setZoom(this.viewport.zoom / 1.5, e.clientX, e.clientY);
      } else {
        this.viewport.setZoom(this.viewport.zoom * 1.5, e.clientX, e.clientY);
      }
      return;
    }

    if (this.activeTool === 'eyedropper') {
      if (inBounds) {
        const picked = this.layerManager.getPixelColorAt(x, y);
        this.primaryColor = picked.hex;
        if (this.onColorPicked) this.onColorPicked(picked.hex);
      }
      return;
    }

    if (this.activeTool === 'bucket') {
      if (inBounds) {
        this.ensureAutoLayer(`Fill Bucket`);
        this.floodFill(x, y, this.primaryColor);
        this.recordHistory('Paint Bucket Fill');
      }
      return;
    }

    // ==========================================
    // 3. DRAWING & SHAPE TOOLS (WITH AUTO-LAYER)
    // ==========================================
    const isBrushLike = ['brush', 'pencil', 'eraser'].includes(this.activeTool);
    const isShapeTool = (this.activeTool === 'shape');

    // An eraser must work on the selected layer. Creating a fresh, empty
    // layer first makes destination-out appear broken because there are no
    // pixels on that layer to remove.
    if ((isBrushLike && this.activeTool !== 'eraser') || isShapeTool) {
      const layerTitle = isShapeTool ? `Shape: ${this.shapeType}` : `${this.activeTool.charAt(0).toUpperCase() + this.activeTool.slice(1)}`;
      this.ensureAutoLayer(layerTitle);
    }

    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer || activeLayer.locked) {
      if (this.onStatusUpdate) this.onStatusUpdate('Active layer is locked! Unlock it to draw.');
      return;
    }

    this.isDrawing = true;
    this.startPoint = { x, y };
    this.lastPoint = { x, y };
    this.points = [{ x, y }];

    if (isBrushLike) {
      this.drawStrokeStart(activeLayer.ctx, x, y);
    }
  }

  onPointerMove(e) {
    const coords = this.viewport.screenToCanvas(e.clientX, e.clientY);

    // Update circular brush cursor
    this.updateBrushCursorPosition(e, coords);

    if (this.onStatusUpdate) {
      this.onStatusUpdate(null, coords.x, coords.y);
    }

    // Viewport Panning
    if (this.isPanning) {
      const dx = e.clientX - this.startPoint.x;
      const dy = e.clientY - this.startPoint.y;
      this.viewport.panX += dx;
      this.viewport.panY += dy;
      this.startPoint = { x: e.clientX, y: e.clientY };
      this.viewport.updateTransform();
      return;
    }

    // Move Tool Dragging
    if (this.isMovingLayer) {
      const dx = coords.x - this.moveLastPoint.x;
      const dy = coords.y - this.moveLastPoint.y;

      if (dx !== 0 || dy !== 0) {
        this.layerManager.translateLayer(dx, dy);
        this.hasMovedLayer = true;
        this.moveLastPoint = { x: coords.x, y: coords.y };

        // Draw live Photoshop-style move boundary & coordinate tag on overlay
        this.drawMoveBoundaryOverlay(coords.x - this.moveStartPoint.x, coords.y - this.moveStartPoint.y);
      }
      return;
    }

    if (!this.isDrawing) return;

    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    const { x, y } = coords;

    if (['brush', 'pencil', 'eraser'].includes(this.activeTool)) {
      this.drawStrokeMove(activeLayer.ctx, x, y);
    } else if (this.activeTool === 'shape') {
      this.drawShapePreview(this.startPoint.x, this.startPoint.y, x, y);
    }
  }

  updateBrushCursorPosition(e, coords) {
    if (!this.brushCursorEl) return;

    const isBrushLike = ['brush', 'pencil', 'eraser', 'clone', 'spot-healing', 'healing-brush', 'dodge', 'burn', 'sponge', 'blur-tool', 'sharpen-tool', 'smudge'].includes(this.activeTool);

    if (!isBrushLike || this.capsLockCrosshair || !coords.inBounds) {
      this.brushCursorEl.style.display = 'none';
      return;
    }

    const diameter = Math.max(3, this.brushSize * this.viewport.zoom);
    this.brushCursorEl.style.display = 'block';
    this.brushCursorEl.style.width = `${diameter}px`;
    this.brushCursorEl.style.height = `${diameter}px`;
    this.brushCursorEl.style.left = `${e.clientX}px`;
    this.brushCursorEl.style.top = `${e.clientY}px`;
  }

  drawMoveBoundaryOverlay(totalDx, totalDy) {
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    const bbox = this.layerManager.getLayerBoundingBox();
    if (!bbox || bbox.isEmpty) return;

    this.overlayCtx.save();
    this.overlayCtx.strokeStyle = '#3b82f6';
    this.overlayCtx.lineWidth = 1.5;
    this.overlayCtx.setLineDash([5, 5]);

    // Bounding box
    this.overlayCtx.strokeRect(bbox.left, bbox.top, bbox.width, bbox.height);

    // Corner handles
    this.overlayCtx.fillStyle = '#ffffff';
    this.overlayCtx.setLineDash([]);
    const handleSize = 6;
    const corners = [
      [bbox.left, bbox.top],
      [bbox.left + bbox.width, bbox.top],
      [bbox.left + bbox.width, bbox.top + bbox.height],
      [bbox.left, bbox.top + bbox.height]
    ];
    corners.forEach(([cx, cy]) => {
      this.overlayCtx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
      this.overlayCtx.strokeRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
    });

    // Delta badge
    const badgeText = `ΔX: ${Math.round(totalDx)}px  ΔY: ${Math.round(totalDy)}px`;
    this.overlayCtx.font = '11px Outfit, sans-serif';
    this.overlayCtx.fillStyle = 'rgba(20, 24, 33, 0.85)';
    this.overlayCtx.fillRect(bbox.left, bbox.top - 22, 130, 18);
    this.overlayCtx.fillStyle = '#60a5fa';
    this.overlayCtx.fillText(badgeText, bbox.left + 6, bbox.top - 9);

    this.overlayCtx.restore();
  }

  onPointerUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
      this.viewport.stage.classList.remove('is-panning');
      return;
    }

    if (this.isMovingLayer) {
      this.isMovingLayer = false;
      this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
      if (this.hasMovedLayer) {
        const activeLayer = this.layerManager.getActiveLayer();
        this.recordHistory(`Move Layer: ${activeLayer ? activeLayer.name : ''}`);
      }
      return;
    }

    if (!this.isDrawing) return;
    this.isDrawing = false;

    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    const { x, y } = this.viewport.screenToCanvas(e.clientX, e.clientY);

    if (this.activeTool === 'shape') {
      this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
      this.drawShapeFinal(activeLayer.ctx, this.startPoint.x, this.startPoint.y, x, y);
      this.recordHistory(`Shape: ${this.shapeType}`);
    } else if (['brush', 'pencil', 'eraser'].includes(this.activeTool)) {
      this.drawStrokeEnd(activeLayer.ctx);
      this.recordHistory(this.activeTool.charAt(0).toUpperCase() + this.activeTool.slice(1));
    }

    this.layerManager.notify();
  }

  // ==========================================
  // BRUSH, PENCIL & ERASER DRAWING LOGIC
  // ==========================================

  setupStrokeContext(ctx) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (this.activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = this.brushSize;
    } else if (this.activeTool === 'pencil') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = this.primaryColor;
      ctx.fillStyle = this.primaryColor;
      ctx.lineWidth = Math.max(1, Math.round(this.brushSize / 2));
      ctx.lineCap = 'square';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = this.primaryColor;
      ctx.fillStyle = this.primaryColor;
      ctx.lineWidth = this.brushSize;
      ctx.globalAlpha = this.brushOpacity;

      if (this.brushHardness < 90) {
        ctx.shadowBlur = (100 - this.brushHardness) * 0.25;
        ctx.shadowColor = this.primaryColor;
      } else {
        ctx.shadowBlur = 0;
      }
    }
  }

  drawStrokeStart(ctx, x, y) {
    if (this.activeTool === 'brush' && this.paintBrushes && this.paintBrushes.brushType !== 'normal') {
      this.paintBrushes.drawBrushStroke(ctx, x, y, x, y, this.brushSize, this.primaryColor, this.brushOpacity, this.brushHardness);
      this.lastPoint = { x, y };
      return;
    }

    this.setupStrokeContext(ctx);
    this.strokeContextActive = true;

    ctx.beginPath();
    ctx.arc(x, y, (this.activeTool === 'pencil' ? 1 : this.brushSize / 2), 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, y);
    this.lastPoint = { x, y };
  }

  drawStrokeMove(ctx, x, y) {
    this.points.push({ x, y });

    if (this.activeTool === 'brush' && this.paintBrushes && this.paintBrushes.brushType !== 'normal') {
      this.paintBrushes.drawBrushStroke(ctx, this.lastPoint.x, this.lastPoint.y, x, y, this.brushSize, this.primaryColor, this.brushOpacity, this.brushHardness);
      this.lastPoint = { x, y };
      return;
    }

    if (this.activeTool === 'pencil') {
      ctx.lineTo(x, y);
      ctx.stroke();
      this.lastPoint = { x, y };
      return;
    }

    if (this.points.length > 2) {
      const p1 = this.points[this.points.length - 2];
      const p2 = this.points[this.points.length - 1];
      const midPoint = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2
      };

      ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(midPoint.x, midPoint.y);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    this.lastPoint = { x, y };
  }

  drawStrokeEnd(ctx) {
    if (this.strokeContextActive) {
      ctx.restore();
      this.strokeContextActive = false;
    }
    this.points = [];
  }

  // ==========================================
  // FLOOD FILL (PAINT BUCKET) ALGORITHM
  // ==========================================

  floodFill(startX, startY, fillColorHex, tolerance = 32) {
    const activeLayer = this.layerManager.getActiveLayer();
    if (!activeLayer) return;

    const ctx = activeLayer.ctx;
    const width = this.layerManager.width;
    const height = this.layerManager.height;

    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const startIndex = (startY * width + startX) * 4;
    const startR = data[startIndex];
    const startG = data[startIndex + 1];
    const startB = data[startIndex + 2];
    const startA = data[startIndex + 3];

    const fillRGBA = this.hexToRgba(fillColorHex);
    if (
      Math.abs(startR - fillRGBA.r) <= tolerance &&
      Math.abs(startG - fillRGBA.g) <= tolerance &&
      Math.abs(startB - fillRGBA.b) <= tolerance &&
      Math.abs(startA - fillRGBA.a) <= tolerance
    ) {
      return;
    }

    const matchColor = (index) => {
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];
      return (
        Math.abs(r - startR) <= tolerance &&
        Math.abs(g - startG) <= tolerance &&
        Math.abs(b - startB) <= tolerance &&
        Math.abs(a - startA) <= tolerance
      );
    };

    const colorPixel = (index) => {
      data[index] = fillRGBA.r;
      data[index + 1] = fillRGBA.g;
      data[index + 2] = fillRGBA.b;
      data[index + 3] = fillRGBA.a;
    };

    const queue = [startX, startY];
    const visited = new Uint8Array(width * height);
    visited[startY * width + startX] = 1;

    let head = 0;
    while (head < queue.length) {
      const cx = queue[head++];
      const cy = queue[head++];
      const cIndex = (cy * width + cx) * 4;

      colorPixel(cIndex);

      const neighbors = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1]
      ];

      for (let i = 0; i < 4; i++) {
        const [nx, ny] = neighbors[i];
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const vIdx = ny * width + nx;
          if (!visited[vIdx]) {
            visited[vIdx] = 1;
            const nIndex = (ny * width + nx) * 4;
            if (matchColor(nIndex)) {
              queue.push(nx, ny);
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  // ==========================================
  // COMPLETE 20+ MS PAINT SHAPES ENGINE
  // ==========================================

  drawShapePreview(x1, y1, x2, y2) {
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    this.renderShapeGeometry(this.overlayCtx, x1, y1, x2, y2);
  }

  drawShapeFinal(ctx, x1, y1, x2, y2) {
    this.renderShapeGeometry(ctx, x1, y1, x2, y2);
  }

  renderShapeGeometry(ctx, x1, y1, x2, y2) {
    ctx.save();
    ctx.strokeStyle = this.primaryColor;
    ctx.fillStyle = this.secondaryColor;
    ctx.lineWidth = this.brushSize;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.globalAlpha = this.brushOpacity;

    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.max(1, Math.abs(x2 - x1));
    const height = Math.max(1, Math.abs(y2 - y1));
    const right = left + width;
    const bottom = top + height;
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    ctx.beginPath();

    switch (this.shapeType) {
      case 'line':
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        break;

      case 'curve':
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2 - Math.min(160, height * this.shapeCurveBend);
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(midX, midY, x2, y2);
        break;

      case 'rectangle':
        ctx.rect(left, top, width, height);
        break;

      case 'rounded-rect':
        const radius = Math.min(this.shapeCornerRadius, width / 2, height / 2);
        ctx.roundRect(left, top, width, height, radius);
        break;

      case 'circle':
      case 'ellipse':
        ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
        break;

      case 'triangle':
        ctx.moveTo(centerX, top);
        ctx.lineTo(right, bottom);
        ctx.lineTo(left, bottom);
        ctx.closePath();
        break;

      case 'right-triangle':
        ctx.moveTo(left, top);
        ctx.lineTo(right, bottom);
        ctx.lineTo(left, bottom);
        ctx.closePath();
        break;

      case 'diamond':
        ctx.moveTo(centerX, top);
        ctx.lineTo(right, centerY);
        ctx.lineTo(centerX, bottom);
        ctx.lineTo(left, centerY);
        ctx.closePath();
        break;

      case 'pentagon':
        this.drawPolygonPath(ctx, centerX, centerY, Math.min(width, height) / 2, 5);
        break;

      case 'hexagon':
      case 'polygon':
        this.drawPolygonPath(ctx, centerX, centerY, Math.min(width, height) / 2, 6);
        break;

      case 'arrow-right':
      case 'arrow':
        this.drawBlockArrow(ctx, left, top, width, height, 'right');
        break;

      case 'arrow-left':
        this.drawBlockArrow(ctx, left, top, width, height, 'left');
        break;

      case 'arrow-up':
        this.drawBlockArrow(ctx, left, top, width, height, 'up');
        break;

      case 'arrow-down':
        this.drawBlockArrow(ctx, left, top, width, height, 'down');
        break;

      case 'star-4':
        this.drawStar(ctx, centerX, centerY, 4, Math.min(width, height) / 2, Math.min(width, height) / 2 * this.shapeStarInnerRatio);
        break;

      case 'star':
      case 'star-5':
        this.drawStar(ctx, centerX, centerY, 5, Math.min(width, height) / 2, Math.min(width, height) / 2 * this.shapeStarInnerRatio);
        break;

      case 'star-6':
        this.drawStar(ctx, centerX, centerY, 6, Math.min(width, height) / 2, Math.min(width, height) / 2 * this.shapeStarInnerRatio);
        break;

      case 'heart':
        this.drawHeart(ctx, left, top, width, height);
        break;

      case 'lightning':
        this.drawLightning(ctx, left, top, width, height);
        break;

      case 'speech-bubble':
        this.drawCallout(ctx, left, top, width, height);
        break;

      case 'cloud-callout':
        this.drawCloudCallout(ctx, left, top, width, height);
        break;

      default:
        ctx.rect(left, top, width, height);
    }

    if (this.shapeType !== 'line' && this.shapeType !== 'curve') {
      if (this.shapeFill) ctx.fill();
      if (this.shapeStroke) ctx.stroke();
    } else {
      ctx.stroke();
    }

    ctx.restore();
  }

  drawPolygonPath(ctx, cx, cy, radius, sides) {
    const angleStep = (Math.PI * 2) / sides;
    const startAngle = -Math.PI / 2;
    for (let i = 0; i < sides; i++) {
      const a = startAngle + i * angleStep;
      const px = cx + Math.cos(a) * radius;
      const py = cy + Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  drawBlockArrow(ctx, left, top, w, h, direction) {
    if (direction === 'right') {
      const shaftTop = top + h * 0.25;
      const shaftH = h * 0.5;
      const headStart = left + w * 0.6;
      ctx.moveTo(left, shaftTop);
      ctx.lineTo(headStart, shaftTop);
      ctx.lineTo(headStart, top);
      ctx.lineTo(left + w, top + h / 2);
      ctx.lineTo(headStart, top + h);
      ctx.lineTo(headStart, shaftTop + shaftH);
      ctx.lineTo(left, shaftTop + shaftH);
      ctx.closePath();
    } else if (direction === 'left') {
      const shaftTop = top + h * 0.25;
      const shaftH = h * 0.5;
      const headStart = left + w * 0.4;
      ctx.moveTo(left + w, shaftTop);
      ctx.lineTo(headStart, shaftTop);
      ctx.lineTo(headStart, top);
      ctx.lineTo(left, top + h / 2);
      ctx.lineTo(headStart, top + h);
      ctx.lineTo(headStart, shaftTop + shaftH);
      ctx.lineTo(left + w, shaftTop + shaftH);
      ctx.closePath();
    } else if (direction === 'up') {
      const shaftLeft = left + w * 0.25;
      const shaftW = w * 0.5;
      const headStart = top + h * 0.4;
      ctx.moveTo(shaftLeft, top + h);
      ctx.lineTo(shaftLeft, headStart);
      ctx.lineTo(left, headStart);
      ctx.lineTo(left + w / 2, top);
      ctx.lineTo(left + w, headStart);
      ctx.lineTo(shaftLeft + shaftW, headStart);
      ctx.lineTo(shaftLeft + shaftW, top + h);
      ctx.closePath();
    } else { // down
      const shaftLeft = left + w * 0.25;
      const shaftW = w * 0.5;
      const headStart = top + h * 0.6;
      ctx.moveTo(shaftLeft, top);
      ctx.lineTo(shaftLeft + shaftW, top);
      ctx.lineTo(shaftLeft + shaftW, headStart);
      ctx.lineTo(left + w, headStart);
      ctx.lineTo(left + w / 2, top + h);
      ctx.lineTo(left, headStart);
      ctx.lineTo(shaftLeft, headStart);
      ctx.closePath();
    }
  }

  drawHeart(ctx, left, top, w, h) {
    const cx = left + w / 2;
    const cy = top + h * 0.35;
    const r = Math.min(w, h) * 0.28;

    ctx.moveTo(cx, top + h * 0.85);
    ctx.bezierCurveTo(left, top + h * 0.55, left, top + h * 0.15, cx - r, top + h * 0.15);
    ctx.bezierCurveTo(cx - r / 2, top + h * 0.15, cx, top + h * 0.28, cx, top + h * 0.38);
    ctx.bezierCurveTo(cx, top + h * 0.28, cx + r / 2, top + h * 0.15, cx + r, top + h * 0.15);
    ctx.bezierCurveTo(left + w, top + h * 0.15, left + w, top + h * 0.55, cx, top + h * 0.85);
    ctx.closePath();
  }

  drawLightning(ctx, left, top, w, h) {
    ctx.moveTo(left + w * 0.55, top);
    ctx.lineTo(left + w * 0.15, top + h * 0.55);
    ctx.lineTo(left + w * 0.45, top + h * 0.55);
    ctx.lineTo(left + w * 0.35, top + h);
    ctx.lineTo(left + w * 0.85, top + h * 0.42);
    ctx.lineTo(left + w * 0.55, top + h * 0.42);
    ctx.closePath();
  }

  drawCallout(ctx, left, top, w, h) {
    const r = 12;
    const tailW = Math.min(24, w * 0.2);
    const bubbleH = h - 20;

    ctx.moveTo(left + r, top);
    ctx.lineTo(left + w - r, top);
    ctx.quadraticCurveTo(left + w, top, left + w, top + r);
    ctx.lineTo(left + w, top + bubbleH - r);
    ctx.quadraticCurveTo(left + w, top + bubbleH, left + w - r, top + bubbleH);
    ctx.lineTo(left + tailW * 2, top + bubbleH);
    ctx.lineTo(left + tailW, top + h);
    ctx.lineTo(left + tailW * 1.4, top + bubbleH);
    ctx.lineTo(left + r, top + bubbleH);
    ctx.quadraticCurveTo(left, top + bubbleH, left, top + bubbleH - r);
    ctx.lineTo(left, top + r);
    ctx.quadraticCurveTo(left, top, left + r, top);
    ctx.closePath();
  }

  drawCloudCallout(ctx, left, top, w, h) {
    const bubbleH = h - 16;
    ctx.moveTo(left + w * 0.25, top + bubbleH);
    ctx.bezierCurveTo(left, top + bubbleH, left, top + bubbleH * 0.5, left + w * 0.2, top + bubbleH * 0.4);
    ctx.bezierCurveTo(left + w * 0.1, top, left + w * 0.5, top, left + w * 0.5, top + bubbleH * 0.25);
    ctx.bezierCurveTo(left + w * 0.6, top, left + w * 0.9, top, left + w * 0.85, top + bubbleH * 0.5);
    ctx.bezierCurveTo(left + w, top + bubbleH * 0.6, left + w, top + bubbleH, left + w * 0.7, top + bubbleH);
    ctx.lineTo(left + w * 0.35, top + bubbleH);
    ctx.lineTo(left + w * 0.2, top + h);
    ctx.lineTo(left + w * 0.28, top + bubbleH);
    ctx.closePath();
  }

  hexToRgba(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) {
      c = c.split('').map(x => x + x).join('');
    }
    const num = parseInt(c, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
      a: 255
    };
  }

  recordHistory(actionName) {
    this.historyManager.pushState(actionName, () => this.layerManager.createSnapshot());
  }
}

/**
 * Canvas Paint Pro - Photoshop Advanced Layer Engine
 * Multi-layer rendering, Layer Groups, Clipping Masks, Layer Masks, Blend Modes, and Opacity
 */

export class LayerManager {
  constructor(stackContainer, width = 1920, height = 1080) {
    this.stackContainer = stackContainer;
    this.width = width;
    this.height = height;

    this.layers = [];
    this.activeLayerId = null;
    this.layerCounter = 1;

    this.onLayersChange = null;
  }

  init(defaultBg = 'white') {
    this.layers = [];
    this.stackContainer.innerHTML = '';

    const baseLayer = this.addLayer('Background', false);
    if (defaultBg === 'white') {
      baseLayer.ctx.fillStyle = '#ffffff';
      baseLayer.ctx.fillRect(0, 0, this.width, this.height);
    } else if (defaultBg === 'black') {
      baseLayer.ctx.fillStyle = '#000000';
      baseLayer.ctx.fillRect(0, 0, this.width, this.height);
    }

    this.updateThumbnails();
    this.notify();
  }

  resize(newWidth, newHeight) {
    const oldW = this.width;
    const oldH = this.height;
    this.width = newWidth;
    this.height = newHeight;

    this.layers.forEach((layer) => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = oldW;
      tempCanvas.height = oldH;
      tempCanvas.getContext('2d').drawImage(layer.canvas, 0, 0);

      layer.canvas.width = newWidth;
      layer.canvas.height = newHeight;
      layer.ctx = layer.canvas.getContext('2d', { willReadFrequently: true });
      layer.ctx.drawImage(tempCanvas, 0, 0);

      if (layer.maskCanvas) {
        layer.maskCanvas.width = newWidth;
        layer.maskCanvas.height = newHeight;
      }
    });

    this.notify();
  }

  addLayer(name = null, notify = true) {
    const layerId = `layer-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const layerName = name || `Layer ${this.layerCounter++}`;

    const canvas = document.createElement('canvas');
    canvas.id = layerId;
    canvas.className = 'layer-canvas-item';
    canvas.width = this.width;
    canvas.height = this.height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const newLayer = {
      id: layerId,
      name: layerName,
      canvas: canvas,
      ctx: ctx,
      visible: true,
      locked: false,
      opacity: 1.0,
      blendMode: 'source-over',
      isClippingMask: false, // Clipping mask to layer below
      hasMask: false,
      maskCanvas: null,
      groupId: null
    };

    if (this.activeLayerId) {
      const idx = this.layers.findIndex(l => l.id === this.activeLayerId);
      this.layers.splice(idx + 1, 0, newLayer);
    } else {
      this.layers.push(newLayer);
    }

    this.activeLayerId = layerId;
    this.syncDOM();

    if (notify) this.notify();
    return newLayer;
  }

  // Layer Masking
  addLayerMask(layerId = null) {
    const targetId = layerId || this.activeLayerId;
    const layer = this.layers.find(l => l.id === targetId);
    if (!layer || layer.hasMask) return;

    layer.hasMask = true;
    layer.maskCanvas = document.createElement('canvas');
    layer.maskCanvas.width = this.width;
    layer.maskCanvas.height = this.height;
    const mCtx = layer.maskCanvas.getContext('2d');
    mCtx.fillStyle = '#ffffff'; // White reveals all
    mCtx.fillRect(0, 0, this.width, this.height);

    this.notify();
  }

  // Clipping Mask toggle
  toggleClippingMask(layerId = null) {
    const targetId = layerId || this.activeLayerId;
    const layer = this.layers.find(l => l.id === targetId);
    if (!layer) return;

    layer.isClippingMask = !layer.isClippingMask;
    this.notify();
  }

  duplicateActiveLayer() {
    const current = this.getActiveLayer();
    if (!current) return;

    const dupName = `${current.name} (Copy)`;
    const newLayer = this.addLayer(dupName, false);
    newLayer.ctx.drawImage(current.canvas, 0, 0);
    newLayer.opacity = current.opacity;
    newLayer.blendMode = current.blendMode;
    newLayer.visible = current.visible;
    newLayer.isClippingMask = current.isClippingMask;

    this.applyLayerStyles(newLayer);
    this.notify();
    return newLayer;
  }

  deleteActiveLayer() {
    if (this.layers.length <= 1) {
      alert('Document must contain at least one layer.');
      return false;
    }

    const idx = this.layers.findIndex(l => l.id === this.activeLayerId);
    if (idx === -1) return false;

    const deleted = this.layers.splice(idx, 1)[0];
    deleted.canvas.remove();

    const nextIdx = Math.max(0, idx - 1);
    this.activeLayerId = this.layers[nextIdx].id;

    this.syncDOM();
    this.notify();
    return true;
  }

  moveActiveLayer(delta) {
    const idx = this.layers.findIndex(l => l.id === this.activeLayerId);
    if (idx === -1) return;

    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= this.layers.length) return;

    const [layer] = this.layers.splice(idx, 1);
    this.layers.splice(targetIdx, 0, layer);

    this.syncDOM();
    this.notify();
  }

  mergeDown() {
    const idx = this.layers.findIndex(l => l.id === this.activeLayerId);
    if (idx <= 0) return;

    const upper = this.layers[idx];
    const lower = this.layers[idx - 1];

    lower.ctx.save();
    lower.ctx.globalAlpha = upper.opacity;
    lower.ctx.globalCompositeOperation = upper.blendMode;
    lower.ctx.drawImage(upper.canvas, 0, 0);
    lower.ctx.restore();

    this.layers.splice(idx, 1);
    upper.canvas.remove();
    this.activeLayerId = lower.id;

    this.syncDOM();
    this.notify();
  }

  flattenImage() {
    if (this.layers.length <= 1) return;

    const composite = this.getCompositeCanvas();
    const base = this.layers[0];
    base.name = 'Background';
    base.ctx.clearRect(0, 0, this.width, this.height);
    base.ctx.drawImage(composite, 0, 0);
    base.opacity = 1.0;
    base.blendMode = 'source-over';
    base.visible = true;

    for (let i = this.layers.length - 1; i > 0; i--) {
      this.layers[i].canvas.remove();
    }
    this.layers = [base];
    this.activeLayerId = base.id;

    this.syncDOM();
    this.notify();
  }

  clearActiveLayer() {
    const layer = this.getActiveLayer();
    if (!layer || layer.locked) return;
    layer.ctx.clearRect(0, 0, this.width, this.height);
    this.notify();
  }

  fillActiveLayer(color) {
    const layer = this.getActiveLayer();
    if (!layer || layer.locked) return;
    layer.ctx.fillStyle = color;
    layer.ctx.fillRect(0, 0, this.width, this.height);
    this.notify();
  }

  flipLayer(horizontal = true) {
    const layer = this.getActiveLayer();
    if (!layer || layer.locked) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.width;
    tempCanvas.height = this.height;
    tempCanvas.getContext('2d').drawImage(layer.canvas, 0, 0);

    layer.ctx.clearRect(0, 0, this.width, this.height);
    layer.ctx.save();
    if (horizontal) {
      layer.ctx.translate(this.width, 0);
      layer.ctx.scale(-1, 1);
    } else {
      layer.ctx.translate(0, this.height);
      layer.ctx.scale(1, -1);
    }
    layer.ctx.drawImage(tempCanvas, 0, 0);
    layer.ctx.restore();

    this.notify();
  }

  rotateActiveLayer90() {
    const layer = this.getActiveLayer();
    if (!layer || layer.locked) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.width;
    tempCanvas.height = this.height;
    tempCanvas.getContext('2d').drawImage(layer.canvas, 0, 0);

    layer.ctx.clearRect(0, 0, this.width, this.height);
    layer.ctx.save();
    layer.ctx.translate(this.width / 2, this.height / 2);
    layer.ctx.rotate(Math.PI / 2);
    layer.ctx.drawImage(tempCanvas, -this.width / 2, -this.height / 2);
    layer.ctx.restore();

    this.notify();
  }

  getActiveLayer() {
    return this.layers.find(l => l.id === this.activeLayerId) || null;
  }

  setActiveLayer(layerId) {
    this.activeLayerId = layerId;
    this.notify();
  }

  setLayerVisibility(layerId, visible) {
    const layer = this.layers.find(l => l.id === layerId);
    if (!layer) return;
    layer.visible = visible;
    layer.canvas.style.display = visible ? 'block' : 'none';
    this.notify();
  }

  setLayerLock(layerId, locked) {
    const layer = this.layers.find(l => l.id === layerId);
    if (!layer) return;
    layer.locked = locked;
    this.notify();
  }

  setLayerOpacity(layerId, opacity) {
    const layer = this.layers.find(l => l.id === layerId);
    if (!layer) return;
    layer.opacity = Math.max(0, Math.min(1, opacity));
    this.applyLayerStyles(layer);
    this.notify();
  }

  setLayerBlendMode(layerId, blendMode) {
    const layer = this.layers.find(l => l.id === layerId);
    if (!layer) return;
    layer.blendMode = blendMode;
    this.applyLayerStyles(layer);
    this.notify();
  }

  applyLayerStyles(layer) {
    layer.canvas.style.opacity = layer.opacity;
    const blendMap = {
      'source-over': 'normal',
      'multiply': 'multiply',
      'screen': 'screen',
      'overlay': 'overlay',
      'darken': 'darken',
      'lighten': 'lighten',
      'color-dodge': 'color-dodge',
      'color-burn': 'color-burn',
      'hard-light': 'hard-light',
      'soft-light': 'soft-light',
      'difference': 'difference',
      'exclusion': 'exclusion',
      'hue': 'hue',
      'saturation': 'saturation',
      'color': 'color',
      'luminosity': 'luminosity'
    };
    layer.canvas.style.mixBlendMode = blendMap[layer.blendMode] || 'normal';
  }

  syncDOM() {
    this.stackContainer.innerHTML = '';
    this.layers.forEach((layer) => {
      this.applyLayerStyles(layer);
      layer.canvas.style.display = layer.visible ? 'block' : 'none';
      this.stackContainer.appendChild(layer.canvas);
    });
  }

  getCompositeCanvas() {
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = this.width;
    compositeCanvas.height = this.height;
    const ctx = compositeCanvas.getContext('2d');

    this.layers.forEach((layer, i) => {
      if (!layer.visible) return;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode;

      // Handle clipping mask to layer below
      if (layer.isClippingMask && i > 0) {
        ctx.globalCompositeOperation = 'source-atop';
      }

      // Draw layer pixels
      ctx.drawImage(layer.canvas, 0, 0);

      // Apply Layer Mask if present
      if (layer.hasMask && layer.maskCanvas) {
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(layer.maskCanvas, 0, 0);
      }

      ctx.restore();
    });

    return compositeCanvas;
  }

  getPixelColorAt(x, y) {
    const composite = this.getCompositeCanvas();
    const ctx = composite.getContext('2d');
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    return {
      r: pixel[0],
      g: pixel[1],
      b: pixel[2],
      a: pixel[3],
      hex: `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`
    };
  }

  // Translate / Move layer pixel contents
  translateLayer(dx, dy, layerId = null) {
    const targetId = layerId || this.activeLayerId;
    const layer = this.layers.find(l => l.id === targetId);
    if (!layer || layer.locked) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.width;
    tempCanvas.height = this.height;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(layer.canvas, 0, 0);

    layer.ctx.clearRect(0, 0, this.width, this.height);
    layer.ctx.drawImage(tempCanvas, dx, dy);

    if (layer.maskCanvas) {
      const mTemp = document.createElement('canvas');
      mTemp.width = this.width;
      mTemp.height = this.height;
      mTemp.getContext('2d').drawImage(layer.maskCanvas, 0, 0);
      const mCtx = layer.maskCanvas.getContext('2d');
      mCtx.clearRect(0, 0, this.width, this.height);
      mCtx.drawImage(mTemp, dx, dy);
    }

    this.notify();
  }

  // Auto-Select Layer: find top-most visible unlocked layer with non-transparent pixel at (x, y)
  getLayerAtPoint(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;

    // Check top to bottom
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (!layer.visible) continue;

      const pixel = layer.ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
      if (pixel[3] > 15) { // non-transparent
        return layer;
      }
    }
    return null;
  }

  // Check if a layer has any painted pixels
  isLayerEmpty(layerId = null) {
    const targetId = layerId || this.activeLayerId;
    const layer = this.layers.find(l => l.id === targetId);
    if (!layer) return true;

    // Check downsampled 64x64 or bounding scan for speed
    const step = 8;
    const imgData = layer.ctx.getImageData(0, 0, this.width, this.height);
    const data = imgData.data;
    for (let i = 3; i < data.length; i += 4 * step) {
      if (data[i] > 10) return false;
    }
    return true;
  }

  // Compute bounding box of non-transparent pixels in layer
  getLayerBoundingBox(layerId = null) {
    const targetId = layerId || this.activeLayerId;
    const layer = this.layers.find(l => l.id === targetId);
    if (!layer) return null;

    const imgData = layer.ctx.getImageData(0, 0, this.width, this.height);
    const data = imgData.data;
    const w = this.width;
    const h = this.height;

    let minX = w, minY = h, maxX = 0, maxY = 0;
    let hasPixels = false;

    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const alpha = data[(y * w + x) * 4 + 3];
        if (alpha > 15) {
          hasPixels = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!hasPixels) {
      return { left: 0, top: 0, width: this.width, height: this.height, isEmpty: true };
    }

    return {
      left: Math.max(0, minX - 2),
      top: Math.max(0, minY - 2),
      width: Math.min(this.width, maxX - minX + 4),
      height: Math.min(this.height, maxY - minY + 4),
      isEmpty: false
    };
  }

  createSnapshot() {
    return {
      width: this.width,
      height: this.height,
      activeLayerId: this.activeLayerId,
      layers: this.layers.map(layer => {
        const temp = document.createElement('canvas');
        temp.width = this.width;
        temp.height = this.height;
        temp.getContext('2d').drawImage(layer.canvas, 0, 0);

        return {
          id: layer.id,
          name: layer.name,
          visible: layer.visible,
          locked: layer.locked,
          opacity: layer.opacity,
          blendMode: layer.blendMode,
          isClippingMask: layer.isClippingMask,
          hasMask: layer.hasMask,
          dataCanvas: temp
        };
      })
    };
  }

  restoreSnapshot(snapshot) {
    this.width = snapshot.width;
    this.height = snapshot.height;
    this.activeLayerId = snapshot.activeLayerId;
    this.stackContainer.innerHTML = '';

    this.layers = snapshot.layers.map(data => {
      const canvas = document.createElement('canvas');
      canvas.id = data.id;
      canvas.className = 'layer-canvas-item';
      canvas.width = this.width;
      canvas.height = this.height;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(data.dataCanvas, 0, 0);

      const restored = {
        id: data.id,
        name: data.name,
        canvas: canvas,
        ctx: ctx,
        visible: data.visible,
        locked: data.locked,
        opacity: data.opacity,
        blendMode: data.blendMode,
        isClippingMask: data.isClippingMask || false,
        hasMask: data.hasMask || false
      };
      this.applyLayerStyles(restored);
      canvas.style.display = restored.visible ? 'block' : 'none';
      this.stackContainer.appendChild(canvas);
      return restored;
    });

    this.notify();
  }

  updateThumbnails() {
    this.layers.forEach(layer => {
      if (!layer.thumbCanvas) {
        layer.thumbCanvas = document.createElement('canvas');
        layer.thumbCanvas.width = 68;
        layer.thumbCanvas.height = 48;
      }
      const tCtx = layer.thumbCanvas.getContext('2d');
      tCtx.clearRect(0, 0, 68, 48);
      tCtx.drawImage(layer.canvas, 0, 0, 68, 48);
    });
  }

  notify() {
    this.updateThumbnails();
    if (this.onLayersChange) {
      this.onLayersChange({
        layers: this.layers,
        activeLayer: this.getActiveLayer(),
        activeLayerId: this.activeLayerId
      });
    }
  }
}

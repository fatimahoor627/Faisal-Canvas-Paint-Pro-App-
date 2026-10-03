/**
 * Canvas Paint Pro - Photoshop Filter & Raster Processing Engine
 * Advanced pixel manipulators, convolutions, color matrices, and live adjustments
 */

export class FilterEngine {
  constructor(layerManager, historyManager) {
    this.layerManager = layerManager;
    this.historyManager = historyManager;
  }

  getActiveLayerData() {
    const layer = this.layerManager.getActiveLayer();
    if (!layer || layer.locked) return null;
    const ctx = layer.ctx;
    const w = this.layerManager.width;
    const h = this.layerManager.height;
    return {
      layer,
      ctx,
      w,
      h,
      imgData: ctx.getImageData(0, 0, w, h)
    };
  }

  // Basic & Advanced Adjustments
  applyAdjustments({ brightness = 0, contrast = 0, saturation = 0, hue = 0, exposure = 0, threshold = 0 }) {
    const target = this.getActiveLayerData();
    if (!target) return;
    const { ctx, imgData, w, h } = target;
    const d = imgData.data;

    // Contrast factor
    const cf = (259 * (contrast + 255)) / (255 * (259 - contrast));
    // Exposure factor
    const ef = Math.pow(2, exposure / 50);

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      // Exposure
      if (exposure !== 0) {
        r *= ef;
        g *= ef;
        b *= ef;
      }

      // Brightness
      if (brightness !== 0) {
        r += brightness;
        g += brightness;
        b += brightness;
      }

      // Contrast
      if (contrast !== 0) {
        r = cf * (r - 128) + 128;
        g = cf * (g - 128) + 128;
        b = cf * (b - 128) + 128;
      }

      // Saturation
      if (saturation !== 0) {
        const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
        const sf = 1 + saturation / 100;
        r = gray + (r - gray) * sf;
        g = gray + (g - gray) * sf;
        b = gray + (b - gray) * sf;
      }

      // Hue Rotation
      if (hue !== 0) {
        const [hVal, sVal, lVal] = this.rgbToHsl(r, g, b);
        let newH = (hVal + hue / 360) % 1;
        if (newH < 0) newH += 1;
        const [nr, ng, nb] = this.hslToRgb(newH, sVal, lVal);
        r = nr;
        g = ng;
        b = nb;
      }

      // Threshold
      if (threshold > 0) {
        const v = (0.2126 * r + 0.7152 * g + 0.0722 * b >= threshold) ? 255 : 0;
        r = g = b = v;
      }

      d[i] = Math.max(0, Math.min(255, r));
      d[i + 1] = Math.max(0, Math.min(255, g));
      d[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imgData, 0, 0);
    this.layerManager.notify();
    this.historyManager.pushState('Adjust Colors', () => this.layerManager.createSnapshot());
  }

  // Convolution Matrix Engine (Sharpen, Edge Detect, Emboss, Box Blur)
  applyConvolution(weights, divisor = null, bias = 0, filterName = 'Convolution') {
    const target = this.getActiveLayerData();
    if (!target) return;
    const { ctx, w, h } = target;

    const side = Math.round(Math.sqrt(weights.length));
    const halfSide = Math.floor(side / 2);
    const src = ctx.getImageData(0, 0, w, h);
    const srcData = src.data;
    const output = ctx.createImageData(w, h);
    const dstData = output.data;

    let div = divisor;
    if (div === null || div === 0) {
      div = weights.reduce((a, b) => a + b, 0);
      if (div === 0) div = 1;
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dstOff = (y * w + x) * 4;
        let r = 0, g = 0, b = 0;

        for (let cy = 0; cy < side; cy++) {
          for (let cx = 0; cx < side; cx++) {
            const scy = Math.min(h - 1, Math.max(0, y + cy - halfSide));
            const scx = Math.min(w - 1, Math.max(0, x + cx - halfSide));
            const srcOff = (scy * w + scx) * 4;
            const wt = weights[cy * side + cx];

            r += srcData[srcOff] * wt;
            g += srcData[srcOff + 1] * wt;
            b += srcData[srcOff + 2] * wt;
          }
        }

        dstData[dstOff] = Math.max(0, Math.min(255, r / div + bias));
        dstData[dstOff + 1] = Math.max(0, Math.min(255, g / div + bias));
        dstData[dstOff + 2] = Math.max(0, Math.min(255, b / div + bias));
        dstData[dstOff + 3] = srcData[dstOff + 3]; // Preserve alpha
      }
    }

    ctx.putImageData(output, 0, 0);
    this.layerManager.notify();
    this.historyManager.pushState(`Filter: ${filterName}`, () => this.layerManager.createSnapshot());
  }

  // Pre-configured Convolution Presets
  sharpen() {
    this.applyConvolution([
       0, -1,  0,
      -1,  5, -1,
       0, -1,  0
    ], 1, 0, 'Sharpen');
  }

  edgeDetection() {
    this.applyConvolution([
      -1, -1, -1,
      -1,  8, -1,
      -1, -1, -1
    ], 1, 0, 'Find Edges');
  }

  emboss() {
    this.applyConvolution([
      -2, -1, 0,
      -1,  1, 1,
       0,  1, 2
    ], 1, 128, 'Emboss');
  }

  gaussianBlur(radius = 3) {
    const target = this.getActiveLayerData();
    if (!target) return;
    const { layer } = target;
    // Fast high-quality canvas CSS blur baked onto layer
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.layerManager.width;
    tempCanvas.height = this.layerManager.height;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.filter = `blur(${radius}px)`;
    tCtx.drawImage(layer.canvas, 0, 0);

    layer.ctx.clearRect(0, 0, this.layerManager.width, this.layerManager.height);
    layer.ctx.drawImage(tempCanvas, 0, 0);
    this.layerManager.notify();
    this.historyManager.pushState(`Gaussian Blur (${radius}px)`, () => this.layerManager.createSnapshot());
  }

  // Stylistic Filters
  vignette(amount = 0.6) {
    const target = this.getActiveLayerData();
    if (!target) return;
    const { ctx, w, h } = target;

    ctx.save();
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.sqrt(cx * cx + cy * cy);
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${amount})`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    this.layerManager.notify();
    this.historyManager.pushState('Filter: Vignette', () => this.layerManager.createSnapshot());
  }

  pixelate(blockSize = 10) {
    const target = this.getActiveLayerData();
    if (!target) return;
    const { ctx, w, h, layer } = target;

    const scaledW = Math.max(1, Math.floor(w / blockSize));
    const scaledH = Math.max(1, Math.floor(h / blockSize));

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = scaledW;
    tempCanvas.height = scaledH;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.imageSmoothingEnabled = false;
    tCtx.drawImage(layer.canvas, 0, 0, scaledW, scaledH);

    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, w, h);
    ctx.imageSmoothingEnabled = true;

    this.layerManager.notify();
    this.historyManager.pushState(`Pixelate (${blockSize}px)`, () => this.layerManager.createSnapshot());
  }

  // Color Utility Helpers
  rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h, s, l];
  }

  hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [r * 255, g * 255, b * 255];
  }
}

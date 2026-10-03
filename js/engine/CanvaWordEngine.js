/**
 * Canvas Paint Pro - MS Word & Canva Advanced Studio Engine
 * Handles:
 * - Word Tools: Strikethrough, Subscript, Superscript, Justify, Curved Text, Line/Letter Spacing, Bullet/Numbered Lists, Find & Replace, Word Count
 * - Canva Tools: Image Frame Masks, One-Click Background Remover, Drop Shadow / Outline / Glow, Color Palette Extractor, Preset Templates
 */

export class CanvaWordEngine {
  constructor(layerManager, vectorEngine, historyManager) {
    this.layerManager = layerManager;
    this.vectorEngine = vectorEngine;
    this.historyManager = historyManager;
  }

  // ==========================================
  // WORD TOOLS & RICH TEXT EFFECTS
  // ==========================================

  // Format active text object
  formatActiveText(props = {}) {
    const sel = this.vectorEngine.getSelectedObject();
    if (!sel || sel.type !== 'text') return;

    Object.assign(sel, props);
    this.vectorEngine.render();
    this.historyManager.pushState('Format Text', () => this.layerManager.createSnapshot());
  }

  // Curved / Arc Text Renderer
  drawCurvedText(ctx, text, cx, cy, radius, startAngle, letterSpacing = 0) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const chars = text.split('');
    const totalChars = chars.length;
    let angle = startAngle;

    for (let i = 0; i < totalChars; i++) {
      const ch = chars[i];
      const charWidth = ctx.measureText(ch).width + letterSpacing;
      const charAngle = charWidth / radius;

      ctx.save();
      ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(ch, 0, 0);
      ctx.restore();

      angle += charAngle;
    }
    ctx.restore();
  }

  // Find & Replace across all text elements in the document
  findAndReplace(findStr, replaceStr, matchCase = false) {
    if (!findStr) return 0;
    let count = 0;

    this.vectorEngine.objects.forEach(obj => {
      if (obj.type === 'text') {
        const regex = new RegExp(findStr, matchCase ? 'g' : 'gi');
        const matches = obj.text.match(regex);
        if (matches) {
          count += matches.length;
          obj.text = obj.text.replace(regex, replaceStr);
        }
      }
    });

    if (count > 0) {
      this.vectorEngine.render();
      this.historyManager.pushState(`Find & Replace (${count})`, () => this.layerManager.createSnapshot());
    }
    return count;
  }

  // Word and character count for status bar
  getWordCountStats() {
    let totalWords = 0;
    let totalChars = 0;

    this.vectorEngine.objects.forEach(obj => {
      if (obj.type === 'text' && obj.text) {
        const words = obj.text.trim().split(/\s+/).filter(w => w.length > 0);
        totalWords += words.length;
        totalChars += obj.text.length;
      }
    });

    return { words: totalWords, chars: totalChars };
  }

  // ==========================================
  // CANVA IMAGE FRAME MASKS
  // ==========================================

  applyImageFrameMask(shape = 'circle') {
    const layer = this.layerManager.getActiveLayer();
    if (!layer || layer.locked) return;

    const w = this.layerManager.width;
    const h = this.layerManager.height;
    const ctx = layer.ctx;

    // Create mask
    const mask = document.createElement('canvas');
    mask.width = w;
    mask.height = h;
    const mCtx = mask.getContext('2d');
    mCtx.fillStyle = '#ffffff';

    const cx = w / 2;
    const cy = h / 2;
    const size = Math.min(w, h) * 0.4;

    mCtx.beginPath();
    if (shape === 'circle') {
      mCtx.arc(cx, cy, size, 0, Math.PI * 2);
    } else if (shape === 'heart') {
      const topY = cy - size * 0.4;
      mCtx.moveTo(cx, cy + size);
      mCtx.bezierCurveTo(cx - size, cy + size * 0.4, cx - size, topY, cx - size / 2, cy - size * 0.6);
      mCtx.bezierCurveTo(cx, cy - size * 0.6, cx, topY, cx, topY);
      mCtx.bezierCurveTo(cx, topY, cx, cy - size * 0.6, cx + size / 2, cy - size * 0.6);
      mCtx.bezierCurveTo(cx + size, topY, cx + size, cy + size * 0.4, cx, cy + size);
    } else if (shape === 'star') {
      const spikes = 5;
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / spikes;
      mCtx.moveTo(cx, cy - size);
      for (let i = 0; i < spikes; i++) {
        mCtx.lineTo(cx + Math.cos(rot) * size, cy + Math.sin(rot) * size);
        rot += step;
        mCtx.lineTo(cx + Math.cos(rot) * (size / 2), cy + Math.sin(rot) * (size / 2));
        rot += step;
      }
      mCtx.closePath();
    }
    mCtx.fill();

    // Clip active layer
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0);
    ctx.restore();

    this.layerManager.notify();
    this.historyManager.pushState(`Frame Mask: ${shape}`, () => this.layerManager.createSnapshot());
  }

  // ==========================================
  // CANVA ONE-CLICK BACKGROUND REMOVER
  // ==========================================

  removeBackground(tolerance = 30) {
    const layer = this.layerManager.getActiveLayer();
    if (!layer || layer.locked) return;

    const ctx = layer.ctx;
    const w = this.layerManager.width;
    const h = this.layerManager.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    // Sample corner pixels to determine dominant background color
    const corners = [
      0, // top-left
      (w - 1) * 4, // top-right
      ((h - 1) * w) * 4, // bottom-left
      ((h - 1) * w + (w - 1)) * 4 // bottom-right
    ];

    let bgR = 0, bgG = 0, bgB = 0;
    corners.forEach(idx => {
      bgR += d[idx];
      bgG += d[idx + 1];
      bgB += d[idx + 2];
    });
    bgR /= 4;
    bgG /= 4;
    bgB /= 4;

    // Erase matching background pixels with smooth alpha falloff
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const diff = Math.hypot(r - bgR, g - bgG, b - bgB);

      if (diff < tolerance) {
        d[i + 3] = 0; // Fully transparent
      } else if (diff < tolerance * 1.5) {
        d[i + 3] = ((diff - tolerance) / (tolerance * 0.5)) * d[i + 3]; // Soft feathered edge
      }
    }

    ctx.putImageData(imgData, 0, 0);
    this.layerManager.notify();
    this.historyManager.pushState('Background Removed', () => this.layerManager.createSnapshot());
  }

  // ==========================================
  // CANVA COLOR PALETTE EXTRACTOR
  // ==========================================

  extractColorPalette(sampleCount = 6) {
    const composite = this.layerManager.getCompositeCanvas();
    const ctx = composite.getContext('2d');
    const w = Math.min(200, this.layerManager.width);
    const h = Math.min(200, this.layerManager.height);

    const small = document.createElement('canvas');
    small.width = w;
    small.height = h;
    small.getContext('2d').drawImage(composite, 0, 0, w, h);

    const data = small.getContext('2d').getImageData(0, 0, w, h).data;
    const colorMap = {};

    for (let i = 0; i < data.length; i += 16) {
      const a = data[i + 3];
      if (a < 128) continue; // Skip transparent
      // Quantize to 32 steps
      const r = Math.round(data[i] / 32) * 32;
      const g = Math.round(data[i + 1] / 32) * 32;
      const b = Math.round(data[i + 2] / 32) * 32;
      const key = `${r},${g},${b}`;
      colorMap[key] = (colorMap[key] || 0) + 1;
    }

    // Sort by popularity
    const sorted = Object.entries(colorMap).sort((a, b) => b[1] - a[1]);
    const hexPalette = sorted.slice(0, sampleCount).map(([rgb]) => {
      const [r, g, b] = rgb.split(',').map(Number);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    });

    return hexPalette.length > 0 ? hexPalette : ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  }
}

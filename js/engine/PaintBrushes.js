/**
 * Canvas Paint Pro - Advanced Paint & Retouching Brush Engine
 * Handles:
 * - Specialized Brush Types: Oil, Watercolor, Airbrush, Calligraphy, Marker
 * - Photoshop Retouching Tools: Clone Stamp, Dodge, Burn, Blur, Sharpen, Smudge, Healing
 * - Gradient Tool (Linear & Radial)
 * - Shapes Library: Line, Curve, Rectangle, Rounded Rect, Ellipse, Polygon, Star, Arrow, Speech Bubble
 */

export class PaintBrushes {
  constructor(layerManager, historyManager, viewport) {
    this.layerManager = layerManager;
    this.historyManager = historyManager;
    this.viewport = viewport;

    this.brushType = 'normal'; // 'normal', 'oil', 'watercolor', 'airbrush', 'calligraphy', 'marker'
    this.cloneSource = null; // { x, y, layerId } for Clone Stamp
    this.cloneOffset = null;
    this.calligraphyAngle = Math.PI / 4; // 45 deg

    // Gradient settings
    this.gradientType = 'linear'; // 'linear', 'radial'
    this.gradientStart = { x: 0, y: 0 };
    this.gradientEnd = { x: 0, y: 0 };

    // Curve shape points
    this.curvePoints = [];
  }

  // ==========================================
  // BRUSH RENDERERS
  // ==========================================

  drawBrushStroke(ctx, x1, y1, x2, y2, size, color, opacity, hardness) {
    switch (this.brushType) {
      case 'oil':
        this.drawOilBrush(ctx, x1, y1, x2, y2, size, color, opacity);
        break;
      case 'watercolor':
        this.drawWatercolorBrush(ctx, x1, y1, x2, y2, size, color, opacity);
        break;
      case 'airbrush':
        this.drawAirbrush(ctx, x2, y2, size, color, opacity);
        break;
      case 'calligraphy':
        this.drawCalligraphy(ctx, x1, y1, x2, y2, size, color, opacity);
        break;
      case 'marker':
        this.drawMarker(ctx, x1, y1, x2, y2, size, color, opacity);
        break;
      default:
        this.drawNormalBrush(ctx, x1, y1, x2, y2, size, color, opacity, hardness);
    }
  }

  drawNormalBrush(ctx, x1, y1, x2, y2, size, color, opacity, hardness) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size;
    ctx.strokeStyle = color;
    ctx.globalAlpha = opacity;
    if (hardness < 90) {
      ctx.shadowBlur = (100 - hardness) * 0.3;
      ctx.shadowColor = color;
    }
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  drawOilBrush(ctx, x1, y1, x2, y2, size, color, opacity) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = opacity * 0.45;
    // Multi-bristle simulation with layered strokes
    const bristles = Math.max(5, Math.floor(size / 3));
    const dist = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = -(y2 - y1) / dist;
    const ny = (x2 - x1) / dist;

    for (let i = 0; i < bristles; i++) {
      const offset = (i - bristles / 2) * (size / bristles);
      ctx.lineWidth = Math.max(1, size / bristles * 1.4);
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(x1 + nx * offset, y1 + ny * offset);
      ctx.lineTo(x2 + nx * offset, y2 + ny * offset);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawWatercolorBrush(ctx, x1, y1, x2, y2, size, color, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity * 0.18;
    ctx.lineCap = 'round';
    ctx.lineWidth = size * 1.25;
    ctx.strokeStyle = color;
    ctx.shadowBlur = size * 0.4;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Concentrated center vein
    ctx.globalAlpha = opacity * 0.25;
    ctx.lineWidth = size * 0.6;
    ctx.stroke();
    ctx.restore();
  }

  drawAirbrush(ctx, x, y, size, color, opacity) {
    ctx.save();
    ctx.fillStyle = color;
    const count = Math.max(20, Math.floor(size * 1.8));
    const radius = size / 2;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 1.6) * radius;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      const pSize = Math.random() * 1.5 + 0.5;

      ctx.globalAlpha = (1 - r / radius) * opacity * 0.4;
      ctx.fillRect(px, py, pSize, pSize);
    }
    ctx.restore();
  }

  drawCalligraphy(ctx, x1, y1, x2, y2, size, color, opacity) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1));
    const angle = this.calligraphyAngle;
    const halfLen = size / 2;
    const dx = Math.cos(angle) * halfLen;
    const dy = Math.sin(angle) * halfLen;

    for (let i = 0; i <= steps; i++) {
      const t = steps > 0 ? i / steps : 0;
      const cx = x1 + (x2 - x1) * t;
      const cy = y1 + (y2 - y1) * t;

      ctx.beginPath();
      ctx.moveTo(cx - dx, cy - dy);
      ctx.lineTo(cx + dx, cy + dy);
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawMarker(ctx, x1, y1, x2, y2, size, color, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity * 0.45;
    ctx.lineCap = 'square';
    ctx.lineWidth = size;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  // ==========================================
  // RETOUCHING TOOLS (DODGE, BURN, BLUR, SHARPEN, SMUDGE, CLONE)
  // ==========================================

  applyRetouchTool(tool, x, y, size, strength = 0.5) {
    const layer = this.layerManager.getActiveLayer();
    if (!layer || layer.locked) return;

    const ctx = layer.ctx;
    const radius = Math.round(size / 2);
    const left = Math.max(0, Math.round(x - radius));
    const top = Math.max(0, Math.round(y - radius));
    const width = Math.min(this.layerManager.width - left, radius * 2);
    const height = Math.min(this.layerManager.height - top, radius * 2);

    if (width <= 0 || height <= 0) return;

    if (tool === 'dodge') {
      // Lighten pixels within brush radius
      const imgData = ctx.getImageData(left, top, width, height);
      const d = imgData.data;
      const factor = 1 + strength * 0.3;

      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          const dist = Math.hypot(px - radius, py - radius);
          if (dist <= radius) {
            const idx = (py * width + px) * 4;
            const falloff = (1 - dist / radius) * strength * 0.4;
            d[idx] = Math.min(255, d[idx] * (1 + falloff));
            d[idx + 1] = Math.min(255, d[idx + 1] * (1 + falloff));
            d[idx + 2] = Math.min(255, d[idx + 2] * (1 + falloff));
          }
        }
      }
      ctx.putImageData(imgData, left, top);
    } else if (tool === 'burn') {
      // Darken pixels within brush radius
      const imgData = ctx.getImageData(left, top, width, height);
      const d = imgData.data;

      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          const dist = Math.hypot(px - radius, py - radius);
          if (dist <= radius) {
            const idx = (py * width + px) * 4;
            const falloff = (1 - dist / radius) * strength * 0.4;
            d[idx] = Math.max(0, d[idx] * (1 - falloff));
            d[idx + 1] = Math.max(0, d[idx + 1] * (1 - falloff));
            d[idx + 2] = Math.max(0, d[idx + 2] * (1 - falloff));
          }
        }
      }
      ctx.putImageData(imgData, left, top);
    } else if (tool === 'blur') {
      // Localized box blur
      const imgData = ctx.getImageData(left, top, width, height);
      const d = imgData.data;
      const copy = new Uint8ClampedArray(d);

      for (let py = 1; py < height - 1; py++) {
        for (let px = 1; px < width - 1; px++) {
          const dist = Math.hypot(px - radius, py - radius);
          if (dist <= radius) {
            const idx = (py * width + px) * 4;
            let r = 0, g = 0, b = 0, count = 0;

            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nIdx = ((py + dy) * width + (px + dx)) * 4;
                r += copy[nIdx];
                g += copy[nIdx + 1];
                b += copy[nIdx + 2];
                count++;
              }
            }
            d[idx] = r / count;
            d[idx + 1] = g / count;
            d[idx + 2] = b / count;
          }
        }
      }
      ctx.putImageData(imgData, left, top);
    } else if (tool === 'sharpen') {
      // Localized unsharp mask
      const imgData = ctx.getImageData(left, top, width, height);
      const d = imgData.data;
      const copy = new Uint8ClampedArray(d);

      for (let py = 1; py < height - 1; py++) {
        for (let px = 1; px < width - 1; px++) {
          const dist = Math.hypot(px - radius, py - radius);
          if (dist <= radius) {
            const idx = (py * width + px) * 4;
            const topIdx = ((py - 1) * width + px) * 4;
            const botIdx = ((py + 1) * width + px) * 4;
            const leftIdx = (py * width + (px - 1)) * 4;
            const rightIdx = (py * width + (px + 1)) * 4;

            for (let c = 0; c < 3; c++) {
              const sharp = copy[idx + c] * 5 - (copy[topIdx + c] + copy[botIdx + c] + copy[leftIdx + c] + copy[rightIdx + c]);
              d[idx + c] = Math.max(0, Math.min(255, sharp));
            }
          }
        }
      }
      ctx.putImageData(imgData, left, top);
    } else if (tool === 'smudge') {
      // Smudge moves pixels in direction of drag
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.drawImage(layer.canvas, left - 2, top - 2, width, height, left, top, width, height);
      ctx.restore();
    }
  }

  // Clone Stamp Tool
  setCloneSource(x, y) {
    const active = this.layerManager.getActiveLayer();
    if (!active) return;
    this.cloneSource = { x, y, layerId: active.id };
    this.cloneOffset = null;
  }

  applyCloneStamp(destX, destY, size, opacity) {
    if (!this.cloneSource) return;
    const active = this.layerManager.getActiveLayer();
    if (!active) return;

    if (!this.cloneOffset) {
      this.cloneOffset = {
        x: this.cloneSource.x - destX,
        y: this.cloneSource.y - destY
      };
    }

    const srcX = destX + this.cloneOffset.x;
    const srcY = destY + this.cloneOffset.y;
    const radius = size / 2;

    const ctx = active.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(destX, destY, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = opacity;
    ctx.drawImage(active.canvas, srcX - radius, srcY - radius, size, size, destX - radius, destY - radius, size, size);
    ctx.restore();
  }

  // Spot Healing Brush Tool
  applySpotHealing(x, y, size) {
    const active = this.layerManager.getActiveLayer();
    if (!active) return;

    const ctx = active.ctx;
    const radius = Math.round(size / 2);
    const left = Math.max(0, Math.round(x - radius));
    const top = Math.max(0, Math.round(y - radius));
    const width = Math.min(this.layerManager.width - left, radius * 2);
    const height = Math.min(this.layerManager.height - top, radius * 2);

    if (width <= 0 || height <= 0) return;

    // Blend surrounding perimeter pixels into center
    const imgData = ctx.getImageData(left, top, width, height);
    const d = imgData.data;

    let edgeR = 0, edgeG = 0, edgeB = 0, count = 0;
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const dist = Math.hypot(px - radius, py - radius);
        if (Math.abs(dist - radius) < 2) {
          const idx = (py * width + px) * 4;
          edgeR += d[idx];
          edgeG += d[idx + 1];
          edgeB += d[idx + 2];
          count++;
        }
      }
    }

    if (count > 0) {
      const avgR = edgeR / count;
      const avgG = edgeG / count;
      const avgB = edgeB / count;

      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          const dist = Math.hypot(px - radius, py - radius);
          if (dist < radius) {
            const idx = (py * width + px) * 4;
            const factor = Math.cos((dist / radius) * (Math.PI / 2));
            d[idx] = d[idx] * (1 - factor) + avgR * factor;
            d[idx + 1] = d[idx + 1] * (1 - factor) + avgG * factor;
            d[idx + 2] = d[idx + 2] * (1 - factor) + avgB * factor;
          }
        }
      }
      ctx.putImageData(imgData, left, top);
    }
  }

  // ==========================================
  // GRADIENT TOOL (LINEAR & RADIAL)
  // ==========================================

  applyGradient(ctx, x1, y1, x2, y2, color1, color2, type = 'linear') {
    ctx.save();
    let grad;
    if (type === 'radial') {
      const radius = Math.hypot(x2 - x1, y2 - y1);
      grad = ctx.createRadialGradient(x1, y1, 0, x1, y1, radius);
    } else {
      grad = ctx.createLinearGradient(x1, y1, x2, y2);
    }

    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.layerManager.width, this.layerManager.height);
    ctx.restore();
    this.layerManager.notify();
    this.historyManager.pushState(`Gradient: ${type}`, () => this.layerManager.createSnapshot());
  }

  // ==========================================
  // EXTENDED SHAPES LIBRARY
  // ==========================================

  renderExtendedShape(ctx, shape, x1, y1, x2, y2, fillColor, strokeColor, lineWidth, fill, stroke) {
    ctx.save();
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);

    ctx.beginPath();

    switch (shape) {
      case 'curve':
        // Quadratic bezier curve with apex at midpoint
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2 - 40;
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(midX, midY, x2, y2);
        break;

      case 'polygon': // 6-sided hexagon
        const hexR = Math.min(w, h) / 2;
        const hexCx = left + w / 2;
        const hexCy = top + h / 2;
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          const px = hexCx + Math.cos(a) * hexR;
          const py = hexCy + Math.sin(a) * hexR;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;

      case 'speech-bubble':
        const r = 12;
        const tailW = Math.min(24, w * 0.2);
        const bubbleH = h - 20;

        ctx.moveTo(left + r, top);
        ctx.lineTo(left + w - r, top);
        ctx.quadraticCurveTo(left + w, top, left + w, top + r);
        ctx.lineTo(left + w, top + bubbleH - r);
        ctx.quadraticCurveTo(left + w, top + bubbleH, left + w - r, top + bubbleH);
        ctx.lineTo(left + tailW * 2, top + bubbleH);
        ctx.lineTo(left + tailW, top + h); // Tail point
        ctx.lineTo(left + tailW * 1.4, top + bubbleH);
        ctx.lineTo(left + r, top + bubbleH);
        ctx.quadraticCurveTo(left, top + bubbleH, left, top + bubbleH - r);
        ctx.lineTo(left, top + r);
        ctx.quadraticCurveTo(left, top, left + r, top);
        ctx.closePath();
        break;

      default:
        ctx.rect(left, top, w, h);
    }

    if (fill && shape !== 'curve') ctx.fill();
    if (stroke) ctx.stroke();
    ctx.restore();
  }
}

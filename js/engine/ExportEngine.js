/**
 * Canvas Paint Pro - Complete System, Export & Print Engine
 * Handles PNG, JPEG, WebP, SVG, Multi-Page PDF, Raw JSON Project Save/Load, High-Res Print
 */

export class ExportEngine {
  constructor(layerManager, vectorEngine, slideEngine) {
    this.layerManager = layerManager;
    this.vectorEngine = vectorEngine;
    this.slideEngine = slideEngine;
  }

  getMergedCompositeCanvas(scale = 1) {
    const origW = this.layerManager.width;
    const origH = this.layerManager.height;
    const targetW = Math.round(origW * scale);
    const targetH = Math.round(origH * scale);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = targetW;
    outCanvas.height = targetH;
    const ctx = outCanvas.getContext('2d');

    ctx.scale(scale, scale);

    // 1. Visible Raster Layers
    this.layerManager.layers.forEach(layer => {
      if (!layer.visible) return;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode;
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    });

    // 2. Vector & Canva Objects
    this.vectorEngine.objects.forEach(obj => {
      this.vectorEngine.drawObject(ctx, obj);
    });

    return outCanvas;
  }

  exportPNG(filename = 'artwork.png', scale = 1) {
    const canvas = this.getMergedCompositeCanvas(scale);
    const link = document.createElement('a');
    link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  exportJPEG(filename = 'artwork.jpg', scale = 1, quality = 0.95) {
    const canvas = this.getMergedCompositeCanvas(scale);
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = canvas.width;
    bgCanvas.height = canvas.height;
    const bCtx = bgCanvas.getContext('2d');
    bCtx.fillStyle = '#ffffff';
    bCtx.fillRect(0, 0, canvas.width, canvas.height);
    bCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = filename.endsWith('.jpg') ? filename : `${filename}.jpg`;
    link.href = bgCanvas.toDataURL('image/jpeg', quality);
    link.click();
  }

  exportWebP(filename = 'artwork.webp', scale = 1, quality = 0.92) {
    const canvas = this.getMergedCompositeCanvas(scale);
    const link = document.createElement('a');
    link.download = filename.endsWith('.webp') ? filename : `${filename}.webp`;
    link.href = canvas.toDataURL('image/webp', quality);
    link.click();
  }

  exportSVG(filename = 'artwork.svg') {
    const canvas = this.getMergedCompositeCanvas(1);
    const dataUrl = canvas.toDataURL('image/png');
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${this.layerManager.width}" height="${this.layerManager.height}" 
     viewBox="0 0 ${this.layerManager.width} ${this.layerManager.height}">
  <image width="${this.layerManager.width}" height="${this.layerManager.height}" xlink:href="${dataUrl}"/>
</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const link = document.createElement('a');
    link.download = filename.endsWith('.svg') ? filename : `${filename}.svg`;
    link.href = URL.createObjectURL(blob);
    link.click();
  }

  // Multi-Page PDF & Single-Page High-Res PDF Generator
  exportMultiPagePDF(filename = 'presentation.pdf', orientation = 'landscape') {
    const slides = this.slideEngine ? this.slideEngine.slides : [{ thumbDataUrl: '' }];
    const imagesHtml = [];

    // Save current active state before generating
    if (this.slideEngine) this.slideEngine.saveCurrentSlideState();

    slides.forEach((slide) => {
      const comp = document.createElement('canvas');
      comp.width = this.layerManager.width;
      comp.height = this.layerManager.height;
      const ctx = comp.getContext('2d');

      if (slide.layerSnapshot) {
        slide.layerSnapshot.layers.forEach(l => {
          if (l.visible) {
            ctx.save();
            ctx.globalAlpha = l.opacity;
            ctx.globalCompositeOperation = l.blendMode;
            ctx.drawImage(l.dataCanvas, 0, 0);
            ctx.restore();
          }
        });
      } else {
        ctx.drawImage(this.getMergedCompositeCanvas(1), 0, 0);
      }

      if (slide.vectorObjects) {
        slide.vectorObjects.forEach(obj => this.vectorEngine.drawObject(ctx, obj));
      }

      const imgUrl = comp.toDataURL('image/jpeg', 0.95);
      imagesHtml.push(`<div class="page"><img src="${imgUrl}" /></div>`);
    });

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';

    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filename}</title>
          <style>
            @page {
              size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: #fff;
            }
            .page {
              page-break-after: always;
              width: 100vw;
              height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          ${imagesHtml.join('')}
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      printFrame.remove();
    }, 4500);
  }

  exportPDF(filename = 'document.pdf', orientation = 'landscape') {
    this.exportMultiPagePDF(filename, orientation);
  }

  openPrintStudio() {
    this.exportMultiPagePDF('Canvas_Paint_Pro_Print.pdf', 'landscape');
  }
}

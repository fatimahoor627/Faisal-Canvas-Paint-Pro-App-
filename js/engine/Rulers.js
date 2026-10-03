/**
 * Canvas Paint Pro - Dynamic Pixel Rulers
 * Synchronizes horizontal and vertical pixel markings with viewport pan and zoom
 */

export class Rulers {
  constructor(rulerXCanvas, rulerYCanvas, viewport) {
    this.rulerX = rulerXCanvas;
    this.rulerY = rulerYCanvas;
    this.ctxX = rulerXCanvas.getContext('2d');
    this.ctxY = rulerYCanvas.getContext('2d');
    this.viewport = viewport;

    this.cursorX = null;
    this.cursorY = null;
    this.visible = true;

    this.init();
  }

  init() {
    this.resizeRulers();
    window.addEventListener('resize', () => this.resizeRulers());
    this.viewport.onTransformChange = () => this.render();
  }

  setVisible(visible) {
    this.visible = visible;
    const topCont = document.getElementById('ruler-top-container');
    const leftCont = document.getElementById('ruler-left-container');
    const corner = document.querySelector('.ruler-corner');
    const viewport = document.getElementById('viewport-container');

    if (topCont) topCont.style.display = visible ? 'block' : 'none';
    if (leftCont) leftCont.style.display = visible ? 'block' : 'none';
    if (corner) corner.style.display = visible ? 'flex' : 'none';
    
    if (viewport) {
      viewport.style.gridTemplateColumns = visible ? '20px 1fr' : '0px 1fr';
      viewport.style.gridTemplateRows = visible ? '20px 1fr' : '0px 1fr';
    }

    if (visible) {
      this.resizeRulers();
      this.render();
    }
  }

  resizeRulers() {
    const topRect = this.rulerX.parentElement.getBoundingClientRect();
    const leftRect = this.rulerY.parentElement.getBoundingClientRect();

    const dpr = window.devicePixelRatio || 1;
    this.rulerX.width = topRect.width * dpr;
    this.rulerX.height = topRect.height * dpr;
    this.rulerX.style.width = `${topRect.width}px`;
    this.rulerX.style.height = `${topRect.height}px`;
    this.ctxX.scale(dpr, dpr);

    this.rulerY.width = leftRect.width * dpr;
    this.rulerY.height = leftRect.height * dpr;
    this.rulerY.style.width = `${leftRect.width}px`;
    this.rulerY.style.height = `${leftRect.height}px`;
    this.ctxY.scale(dpr, dpr);

    this.render();
  }

  updateCursor(canvasX, canvasY) {
    this.cursorX = canvasX;
    this.cursorY = canvasY;
    this.render();
  }

  getStepSize(zoom) {
    const rawStep = 100 / zoom;
    if (rawStep > 400) return 500;
    if (rawStep > 150) return 200;
    if (rawStep > 75) return 100;
    if (rawStep > 35) return 50;
    if (rawStep > 15) return 20;
    return 10;
  }

  render() {
    if (!this.visible) return;

    const { zoom, panX, panY, width: cW, height: cH } = this.viewport;
    const step = this.getStepSize(zoom);
    const subStep = step / 5;

    const rectX = this.rulerX.getBoundingClientRect();
    const rectY = this.rulerY.getBoundingClientRect();

    // 1. Draw Top Ruler (X axis)
    this.ctxX.clearRect(0, 0, rectX.width, rectX.height);
    this.ctxX.fillStyle = '#1a1c21';
    this.ctxX.fillRect(0, 0, rectX.width, rectX.height);

    // Canvas boundary highlight
    const startX = panX;
    const endX = panX + cW * zoom;
    this.ctxX.fillStyle = '#262933';
    this.ctxX.fillRect(startX, 0, endX - startX, rectX.height);

    this.ctxX.strokeStyle = '#3d4352';
    this.ctxX.fillStyle = '#94a3b8';
    this.ctxX.font = '9px "JetBrains Mono", monospace';
    this.ctxX.lineWidth = 1;

    // Draw ticks
    const minCanvasX = Math.floor((-panX / zoom) / subStep) * subStep;
    const maxCanvasX = Math.ceil(((rectX.width - panX) / zoom) / subStep) * subStep;

    for (let x = minCanvasX; x <= maxCanvasX; x += subStep) {
      const screenX = panX + x * zoom;
      const isMajor = Math.abs(x % step) < 0.001;

      this.ctxX.beginPath();
      this.ctxX.moveTo(screenX, rectX.height);
      this.ctxX.lineTo(screenX, isMajor ? rectX.height - 10 : rectX.height - 4);
      this.ctxX.stroke();

      if (isMajor && screenX >= 0 && screenX < rectX.width - 25) {
        this.ctxX.fillText(`${Math.round(x)}`, screenX + 2, 10);
      }
    }

    // Cursor indicator on X
    if (this.cursorX !== null) {
      const curScreenX = panX + this.cursorX * zoom;
      this.ctxX.strokeStyle = '#3b82f6';
      this.ctxX.beginPath();
      this.ctxX.moveTo(curScreenX, 0);
      this.ctxX.lineTo(curScreenX, rectX.height);
      this.ctxX.stroke();
    }

    // 2. Draw Left Ruler (Y axis)
    this.ctxY.clearRect(0, 0, rectY.width, rectY.height);
    this.ctxY.fillStyle = '#1a1c21';
    this.ctxY.fillRect(0, 0, rectY.width, rectY.height);

    const startY = panY;
    const endY = panY + cH * zoom;
    this.ctxY.fillStyle = '#262933';
    this.ctxY.fillRect(0, startY, rectY.width, endY - startY);

    this.ctxY.strokeStyle = '#3d4352';
    this.ctxY.fillStyle = '#94a3b8';
    this.ctxY.font = '9px "JetBrains Mono", monospace';

    const minCanvasY = Math.floor((-panY / zoom) / subStep) * subStep;
    const maxCanvasY = Math.ceil(((rectY.height - panY) / zoom) / subStep) * subStep;

    for (let y = minCanvasY; y <= maxCanvasY; y += subStep) {
      const screenY = panY + y * zoom;
      const isMajor = Math.abs(y % step) < 0.001;

      this.ctxY.beginPath();
      this.ctxY.moveTo(rectY.width, screenY);
      this.ctxY.lineTo(isMajor ? rectY.width - 10 : rectY.width - 4, screenY);
      this.ctxY.stroke();

      if (isMajor && screenY >= 10 && screenY < rectY.height) {
        this.ctxY.save();
        this.ctxY.translate(10, screenY - 2);
        this.ctxY.rotate(-Math.PI / 2);
        this.ctxY.fillText(`${Math.round(y)}`, 0, 0);
        this.ctxY.restore();
      }
    }

    // Cursor indicator on Y
    if (this.cursorY !== null) {
      const curScreenY = panY + this.cursorY * zoom;
      this.ctxY.strokeStyle = '#3b82f6';
      this.ctxY.beginPath();
      this.ctxY.moveTo(0, curScreenY);
      this.ctxY.lineTo(rectY.width, curScreenY);
      this.ctxY.stroke();
    }
  }
}

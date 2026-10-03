/**
 * Canvas Paint Pro - MS Excel & Data Chart Engine
 * Generates Bar Charts, Line Charts, Pie Charts, and Data Tables
 */

export class ChartEngine {
  constructor(layerManager, vectorEngine, historyManager) {
    this.layerManager = layerManager;
    this.vectorEngine = vectorEngine;
    this.historyManager = historyManager;

    this.defaultColors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
    ];
  }

  // ==========================================
  // CHART GENERATOR
  // ==========================================

  createChart({
    type = 'bar', // 'bar', 'line', 'pie', 'doughnut'
    title = 'Quarterly Performance',
    labels = ['Q1', 'Q2', 'Q3', 'Q4'],
    values = [45, 80, 65, 95],
    width = 600,
    height = 400,
    x = null,
    y = null
  }) {
    const chartCanvas = document.createElement('canvas');
    chartCanvas.width = width;
    chartCanvas.height = height;
    const ctx = chartCanvas.getContext('2d');

    // Background card
    ctx.fillStyle = '#1e222b';
    ctx.roundRect(0, 0, width, height, 12);
    ctx.fill();
    ctx.strokeStyle = '#323745';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Chart Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, 24, 34);

    if (type === 'bar') {
      this.renderBarChart(ctx, labels, values, width, height);
    } else if (type === 'line') {
      this.renderLineChart(ctx, labels, values, width, height);
    } else if (type === 'pie' || type === 'doughnut') {
      this.renderPieChart(ctx, labels, values, width, height, type === 'doughnut');
    }

    // Insert as a new Vector Object so it can be moved, scaled, and rotated freely!
    const targetX = x !== null ? x : (this.layerManager.width - width) / 2;
    const targetY = y !== null ? y : (this.layerManager.height - height) / 2;

    const obj = {
      id: `chart-${Date.now()}`,
      type: 'sticker', // Rendered as graphic item
      content: '',
      x: targetX,
      y: targetY,
      width,
      height,
      rotation: 0,
      opacity: 1.0,
      customCanvas: chartCanvas
    };

    // Override drawing for customCanvas
    this.vectorEngine.objects.push(obj);
    this.vectorEngine.selectObject(obj.id);
    this.vectorEngine.render();
    this.historyManager.pushState(`Chart: ${title}`, () => this.layerManager.createSnapshot());
    return obj;
  }

  renderBarChart(ctx, labels, values, w, h) {
    const padLeft = 60;
    const padBottom = 50;
    const chartW = w - padLeft - 40;
    const chartH = h - 60 - padBottom;
    const maxVal = Math.max(...values, 10) * 1.15;

    // Grid lines
    ctx.strokeStyle = '#2b303c';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';

    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const val = Math.round((maxVal / steps) * i);
      const y = 60 + chartH - (i / steps) * chartH;

      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + chartW, y);
      ctx.stroke();

      ctx.fillText(val, padLeft - 10, y + 4);
    }

    // Bars
    const barWidth = Math.min(60, (chartW / values.length) * 0.6);
    const gap = chartW / values.length;

    values.forEach((val, i) => {
      const barH = (val / maxVal) * chartH;
      const x = padLeft + gap * i + (gap - barWidth) / 2;
      const y = 60 + chartH - barH;

      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, this.defaultColors[i % this.defaultColors.length]);
      grad.addColorStop(1, '#1e3a8a');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
      ctx.fill();

      // Value label on top
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(val, x + barWidth / 2, y - 6);

      // Category label below
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '12px "Inter", sans-serif';
      ctx.fillText(labels[i] || `Item ${i+1}`, x + barWidth / 2, 60 + chartH + 20);
    });
  }

  renderLineChart(ctx, labels, values, w, h) {
    const padLeft = 60;
    const padBottom = 50;
    const chartW = w - padLeft - 40;
    const chartH = h - 60 - padBottom;
    const maxVal = Math.max(...values, 10) * 1.15;

    // Grid lines
    ctx.strokeStyle = '#2b303c';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const val = Math.round((maxVal / 4) * i);
      const y = 60 + chartH - (i / 4) * chartH;

      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + chartW, y);
      ctx.stroke();

      ctx.fillText(val, padLeft - 10, y + 4);
    }

    // Points calculation
    const points = values.map((val, i) => {
      const x = padLeft + (chartW / (values.length - 1 || 1)) * i;
      const y = 60 + chartH - (val / maxVal) * chartH;
      return { x, y, val, label: labels[i] };
    });

    // Area Gradient Fill
    ctx.beginPath();
    ctx.moveTo(points[0].x, 60 + chartH);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, 60 + chartH);
    ctx.closePath();

    const areaGrad = ctx.createLinearGradient(0, 60, 0, 60 + chartH);
    areaGrad.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    areaGrad.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Line Path
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Data points & labels
    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.val, p.x, p.y - 10);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '12px "Inter", sans-serif';
      ctx.fillText(p.label, p.x, 60 + chartH + 20);
    });
  }

  renderPieChart(ctx, labels, values, w, h, isDoughnut = false) {
    const total = values.reduce((a, b) => a + b, 0) || 1;
    const cx = w * 0.4;
    const cy = h * 0.55;
    const radius = Math.min(cx, cy) - 30;

    let startAngle = -Math.PI / 2;

    values.forEach((val, i) => {
      const sliceAngle = (val / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = this.defaultColors[i % this.defaultColors.length];
      ctx.fill();
      ctx.strokeStyle = '#1e222b';
      ctx.lineWidth = 2;
      ctx.stroke();

      startAngle = endAngle;
    });

    if (isDoughnut) {
      // Cutout inner circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = '#1e222b';
      ctx.fill();
      ctx.stroke();
    }

    // Legend
    const legendX = w * 0.7;
    let legendY = 80;

    labels.forEach((label, i) => {
      const pct = Math.round((values[i] / total) * 100);

      ctx.fillStyle = this.defaultColors[i % this.defaultColors.length];
      ctx.fillRect(legendX, legendY, 12, 12);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${label} (${pct}%)`, legendX + 20, legendY + 10);

      legendY += 26;
    });
  }

  // ==========================================
  // SPREADSHEET / DATA TABLE GENERATOR
  // ==========================================

  createTable({
    headers = ['Item', 'Category', 'Quantity', 'Price', 'Total'],
    rows = [
      ['Design System', 'UI/UX', '1', '$1,200', '$1,200'],
      ['Canvas Engine', 'Core', '1', '$2,400', '$2,400'],
      ['Filter Suite', 'Raster', '1', '$1,500', '$1,500'],
      ['Presentations', 'Module', '1', '$1,800', '$1,800']
    ],
    width = 650,
    height = 240
  }) {
    const tableCanvas = document.createElement('canvas');
    tableCanvas.width = width;
    tableCanvas.height = height;
    const ctx = tableCanvas.getContext('2d');

    // Card background
    ctx.fillStyle = '#1e222b';
    ctx.roundRect(0, 0, width, height, 10);
    ctx.fill();
    ctx.strokeStyle = '#333846';
    ctx.stroke();

    const colW = width / headers.length;
    const rowH = height / (rows.length + 1);

    // Header Row
    ctx.fillStyle = '#2d3342';
    ctx.beginPath();
    ctx.roundRect(0, 0, width, rowH, [10, 10, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.textAlign = 'center';
    headers.forEach((h, i) => {
      ctx.fillText(h, colW * i + colW / 2, rowH / 2 + 4);
    });

    // Body Rows
    ctx.font = '12px "Inter", sans-serif';
    rows.forEach((row, rIdx) => {
      const y = rowH * (rIdx + 1);
      ctx.fillStyle = rIdx % 2 === 0 ? '#1e222b' : '#232833';
      ctx.fillRect(0, y, width, rowH);

      // Bottom border
      ctx.strokeStyle = '#2c313e';
      ctx.beginPath();
      ctx.moveTo(0, y + rowH);
      ctx.lineTo(width, y + rowH);
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      row.forEach((cell, cIdx) => {
        ctx.fillText(cell, colW * cIdx + colW / 2, y + rowH / 2 + 4);
      });
    });

    const obj = {
      id: `table-${Date.now()}`,
      type: 'sticker',
      content: '',
      x: (this.layerManager.width - width) / 2,
      y: (this.layerManager.height - height) / 2,
      width,
      height,
      rotation: 0,
      opacity: 1.0,
      customCanvas: tableCanvas
    };

    this.vectorEngine.objects.push(obj);
    this.vectorEngine.selectObject(obj.id);
    this.vectorEngine.render();
    this.historyManager.pushState('Insert Data Table', () => this.layerManager.createSnapshot());
    return obj;
  }
}

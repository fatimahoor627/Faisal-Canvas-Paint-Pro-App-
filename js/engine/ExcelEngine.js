/**
 * Canvas Paint Pro - MS Excel Spreadsheet & Formula Engine
 * Handles:
 * - Dynamic Data Grid (Add / Delete Rows & Columns)
 * - Formula Engine: =SUM, =AVERAGE, =MIN, =MAX, =COUNT
 * - Cell Formatting: Text, Currency ($), Percentage (%), Numbers
 * - Table Styling: Corporate Blue, Emerald, Dark Obsidian, Minimalist
 */

export class ExcelEngine {
  constructor(layerManager, vectorEngine, historyManager) {
    this.layerManager = layerManager;
    this.vectorEngine = vectorEngine;
    this.historyManager = historyManager;

    this.tableThemes = {
      corporate: { headerBg: '#2563eb', rowAltBg: '#1e293b', border: '#334155', text: '#ffffff' },
      emerald: { headerBg: '#059669', rowAltBg: '#132e27', border: '#1f4e42', text: '#ffffff' },
      obsidian: { headerBg: '#27272a', rowAltBg: '#18181b', border: '#3f3f46', text: '#f4f4f5' },
      amber: { headerBg: '#d97706', rowAltBg: '#2e2013', border: '#573919', text: '#ffffff' }
    };
  }

  // Evaluate simple formulas like =SUM(A1:A5) or math expression
  evaluateFormula(cellValue, gridData) {
    if (typeof cellValue !== 'string' || !cellValue.startsWith('=')) {
      return cellValue;
    }

    const formula = cellValue.substring(1).trim().toUpperCase();

    // Check SUM, AVERAGE, MIN, MAX, COUNT
    const match = formula.match(/^(SUM|AVERAGE|AVG|MIN|MAX|COUNT)\(([A-Z0-9:, ]+)\)$/);
    if (match) {
      const func = match[1];
      const rangeStr = match[2];
      const numbers = this.extractNumbersFromRange(rangeStr, gridData);

      if (numbers.length === 0) return 0;

      switch (func) {
        case 'SUM':
          return numbers.reduce((a, b) => a + b, 0);
        case 'AVERAGE':
        case 'AVG':
          return numbers.reduce((a, b) => a + b, 0) / numbers.length;
        case 'MIN':
          return Math.min(...numbers);
        case 'MAX':
          return Math.max(...numbers);
        case 'COUNT':
          return numbers.length;
      }
    }

    // Try basic arithmetic eval safely
    try {
      const sanitized = formula.replace(/[^0-9+\-*/().]/g, '');
      return Function(`'use strict'; return (${sanitized})`)();
    } catch {
      return '#VALUE!';
    }
  }

  extractNumbersFromRange(rangeStr, gridData) {
    const nums = [];
    const parts = rangeStr.split(',').map(s => s.trim());

    parts.forEach(part => {
      if (part.includes(':')) {
        // e.g., A1:A4 or B2:C5
        const [startCell, endCell] = part.split(':').map(s => s.trim());
        const startCoord = this.cellNameToCoord(startCell);
        const endCoord = this.cellNameToCoord(endCell);

        if (startCoord && endCoord) {
          const minR = Math.min(startCoord.row, endCoord.row);
          const maxR = Math.max(startCoord.row, endCoord.row);
          const minC = Math.min(startCoord.col, endCoord.col);
          const maxC = Math.max(startCoord.col, endCoord.col);

          for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
              if (gridData[r] && gridData[r][c] !== undefined) {
                const val = parseFloat(String(gridData[r][c]).replace(/[$,%]/g, ''));
                if (!isNaN(val)) nums.push(val);
              }
            }
          }
        }
      } else {
        // Single cell or raw number
        const coord = this.cellNameToCoord(part);
        if (coord && gridData[coord.row] && gridData[coord.row][coord.col] !== undefined) {
          const val = parseFloat(String(gridData[coord.row][coord.col]).replace(/[$,%]/g, ''));
          if (!isNaN(val)) nums.push(val);
        } else {
          const rawNum = parseFloat(part);
          if (!isNaN(rawNum)) nums.push(rawNum);
        }
      }
    });

    return nums;
  }

  cellNameToCoord(name) {
    const m = name.toUpperCase().match(/^([A-Z]+)([0-9]+)$/);
    if (!m) return null;
    const colLetters = m[1];
    const rowNum = parseInt(m[2], 10) - 1; // 0-indexed

    let colNum = 0;
    for (let i = 0; i < colLetters.length; i++) {
      colNum = colNum * 26 + (colLetters.charCodeAt(i) - 64);
    }
    return { col: colNum - 1, row: rowNum };
  }

  formatCellValue(val, format = 'general') {
    if (val === null || val === undefined || val === '') return '';
    const num = parseFloat(String(val).replace(/[$,%]/g, ''));

    if (isNaN(num)) return String(val);

    switch (format) {
      case 'currency':
        return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'percentage':
        return `${(num * (num <= 1 ? 100 : 1)).toFixed(1)}%`;
      case 'number':
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      default:
        return String(val);
    }
  }

  // Render Table to a graphic vector object on canvas
  createSpreadsheetObject({
    headers = ['A (Item)', 'B (Qty)', 'C (Rate)', 'D (Total)'],
    rows = [
      ['Design System', '1', '$1,200', '=$B1*$C1'],
      ['Canvas Engine', '1', '$2,400', '=$B2*$C2'],
      ['Photoshop Suite', '1', '$1,800', '=$B3*$C3'],
      ['Grand Total', '=COUNT(A1:A3)', '', '=SUM(D1:D3)']
    ],
    theme = 'corporate',
    cellFormats = {}
  }) {
    const themeColors = this.tableThemes[theme] || this.tableThemes.corporate;
    const colCount = headers.length;
    const rowCount = rows.length;

    const cellWidth = 140;
    const rowHeight = 36;
    const totalW = colCount * cellWidth;
    const totalH = (rowCount + 1) * rowHeight;

    const tableCanvas = document.createElement('canvas');
    tableCanvas.width = totalW;
    tableCanvas.height = totalH;
    const ctx = tableCanvas.getContext('2d');

    // Header Background
    ctx.fillStyle = themeColors.headerBg;
    ctx.beginPath();
    ctx.roundRect(0, 0, totalW, rowHeight, [8, 8, 0, 0]);
    ctx.fill();

    // Header Text
    ctx.fillStyle = themeColors.text;
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    headers.forEach((h, c) => {
      ctx.fillText(h, c * cellWidth + cellWidth / 2, rowHeight / 2);
    });

    // Body Grid Data with Formula Evaluation
    const evaluatedRows = rows.map((row, rIdx) => {
      return row.map((cell, cIdx) => {
        let val = this.evaluateFormula(cell, rows);
        const fmt = cellFormats[`${rIdx},${cIdx}`] || 'general';
        return this.formatCellValue(val, fmt);
      });
    });

    // Render Body Rows
    evaluatedRows.forEach((row, r) => {
      const y = (r + 1) * rowHeight;

      ctx.fillStyle = (r % 2 === 0) ? '#181b22' : themeColors.rowAltBg;
      ctx.fillRect(0, y, totalW, rowHeight);

      // Row separator
      ctx.strokeStyle = themeColors.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + rowHeight);
      ctx.lineTo(totalW, y + rowHeight);
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px "JetBrains Mono", monospace';
      row.forEach((cell, c) => {
        // Vertical cell line
        ctx.beginPath();
        ctx.moveTo(c * cellWidth, y);
        ctx.lineTo(c * cellWidth, y + rowHeight);
        ctx.stroke();

        ctx.fillText(cell, c * cellWidth + cellWidth / 2, y + rowHeight / 2);
      });
    });

    // Outer table border
    ctx.strokeStyle = themeColors.border;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, totalW, totalH);

    const obj = {
      id: `excel-table-${Date.now()}`,
      type: 'sticker',
      content: '',
      x: (this.layerManager.width - totalW) / 2,
      y: (this.layerManager.height - totalH) / 2,
      width: totalW,
      height: totalH,
      rotation: 0,
      opacity: 1.0,
      customCanvas: tableCanvas
    };

    this.vectorEngine.objects.push(obj);
    this.vectorEngine.selectObject(obj.id);
    this.vectorEngine.render();
    this.historyManager.pushState('Insert Excel Table', () => this.layerManager.createSnapshot());
    return obj;
  }
}

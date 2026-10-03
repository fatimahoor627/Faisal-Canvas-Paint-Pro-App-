/**
 * Canvas Paint Pro - Master Studio Application Orchestrator (Phase 1 of 100+ Tools)
 * Wires the 5-Zone Modular Layout:
 * Zone 1: Top Menubar & Dynamic Properties Ribbon
 * Zone 2: Collapsible Accordion Tool Docks
 * Zone 3: Multi-Tab Center Canvas Workspace
 * Zone 4: Right Dockable Inspector Panel
 * Zone 5: Bottom Status Bar with Live Render FPS & Metrics
 */

import { Viewport } from './engine/Viewport.js';
import { Rulers } from './engine/Rulers.js';
import { LayerManager } from './engine/LayerManager.js';
import { ToolManager } from './engine/ToolManager.js';
import { HistoryManager } from './engine/HistoryManager.js';
import { FilterEngine } from './engine/FilterEngine.js';
import { SelectionEngine } from './engine/SelectionEngine.js';
import { TransformEngine } from './engine/TransformEngine.js';
import { VectorObjectEngine } from './engine/VectorObjectEngine.js';
import { SlideEngine } from './engine/SlideEngine.js';
import { ChartEngine } from './engine/ChartEngine.js';
import { ExportEngine } from './engine/ExportEngine.js';
import { PaintBrushes } from './engine/PaintBrushes.js';
import { CanvaWordEngine } from './engine/CanvaWordEngine.js';
import { ExcelEngine } from './engine/ExcelEngine.js';
import { FPSMeter } from './engine/FPSMeter.js';
import { DocumentManager } from './engine/DocumentManager.js';

class CanvasPaintProApp {
  constructor() {
    this.canvasWidth = 1920;
    this.canvasHeight = 1080;
    this.projectName = 'Untitled-1.cpp';

    this.dom = {};
    this.initDOMReferences();
    this.initEngines();
    this.bindUIEvents();
    this.bindShortcuts();
    this.renderLayersUI();

    setTimeout(() => {
      this.viewport.centerInViewport();
      this.rulers.resizeRulers();
      this.fpsMeter.start();
      this.updateStatusMessage('Studio Suite Active — 5-Zone Workspace & 100+ Tools Ready');
    }, 100);
  }

  initDOMReferences() {
    this.dom = {
      // Containers
      canvasTabsBar: document.getElementById('canvas-tabs-bar'),
      canvasStage: document.getElementById('canvas-stage'),
      canvasWrapper: document.getElementById('canvas-wrapper'),
      layerStack: document.getElementById('layer-canvas-stack'),
      overlayCanvas: document.getElementById('overlay-canvas'),
      slidesDeckPanel: document.getElementById('slides-deck-panel'),
      slidesStrip: document.getElementById('slides-strip'),

      // Rulers
      rulerX: document.getElementById('ruler-x'),
      rulerY: document.getElementById('ruler-y'),

      // Context Bars
      ctxToolIcon: document.getElementById('ctx-tool-icon'),
      ctxToolName: document.getElementById('ctx-tool-name'),
      ctxBrushSettings: document.getElementById('ctx-brush-settings'),
      ctxShapeSettings: document.getElementById('ctx-shape-settings'),
      ctxTextSettings: document.getElementById('ctx-text-settings'),
      ctxTransformSettings: document.getElementById('ctx-transform-settings'),
      ctxMoveSettings: document.getElementById('ctx-move-settings'),
      moveAutoSelect: document.getElementById('move-auto-select'),
      moveLayerName: document.getElementById('move-layer-name'),

      // Auto-Layer & Cursor Quick Mode Buttons
      btnToggleAutoLayer: document.getElementById('btn-toggle-auto-layer'),
      statusAutoLayerChip: document.getElementById('status-auto-layer-chip'),
      autoLayerText: document.getElementById('auto-layer-text'),
      btnToggleCapsCursor: document.getElementById('btn-toggle-caps-cursor'),
      statusCapsChip: document.getElementById('status-caps-chip'),
      capsCursorText: document.getElementById('caps-cursor-text'),
      shapesGridBtns: document.querySelectorAll('.shape-grid-btn'),

      // Brush & Shapes
      brushSubType: document.getElementById('brush-sub-type'),
      brushSize: document.getElementById('brush-size'),
      brushSizeVal: document.getElementById('brush-size-val'),
      brushOpacity: document.getElementById('brush-opacity'),
      brushOpacityVal: document.getElementById('brush-opacity-val'),
      brushHardness: document.getElementById('brush-hardness'),
      brushHardnessVal: document.getElementById('brush-hardness-val'),
      shapeType: document.getElementById('shape-type'),
      shapeFillToggle: document.getElementById('shape-fill-toggle'),
      shapeStrokeToggle: document.getElementById('shape-stroke-toggle'),
      shapeSettingsTitle: document.getElementById('shape-settings-title'),
      shapeCornerRadius: document.getElementById('shape-corner-radius'),
      shapeStarInner: document.getElementById('shape-star-inner'),
      shapeCurveBend: document.getElementById('shape-curve-bend'),

      // Text Controls
      textFontFamily: document.getElementById('text-font-family'),
      textFontSize: document.getElementById('text-font-size'),
      btnTextBold: document.getElementById('btn-text-bold'),
      btnTextItalic: document.getElementById('btn-text-italic'),
      btnTextUnderline: document.getElementById('btn-text-underline'),
      btnTextStrike: document.getElementById('btn-text-strike'),
      btnTextAlignLeft: document.getElementById('btn-text-align-left'),
      btnTextAlignCenter: document.getElementById('btn-text-align-center'),
      btnTextAlignRight: document.getElementById('btn-text-align-right'),
      btnTextCurvedToggle: document.getElementById('btn-text-curved-toggle'),
      btnTextEditContent: document.getElementById('btn-text-edit-content'),

      // Transform Controls
      btnApplyTransform: document.getElementById('btn-apply-transform'),
      btnCancelTransform: document.getElementById('btn-cancel-transform'),

      // Colors
      primarySwatch: document.getElementById('primary-swatch-display'),
      secondarySwatch: document.getElementById('secondary-swatch-display'),
      primaryPicker: document.getElementById('primary-color-picker'),
      secondaryPicker: document.getElementById('secondary-color-picker'),
      swapColorsBtn: document.getElementById('swap-colors-btn'),
      resetColorsBtn: document.getElementById('reset-colors-btn'),
      quickPaletteDock: document.getElementById('quick-palette-dock'),

      // Toolbox Accordions
      accordionHeaders: document.querySelectorAll('.accordion-header'),
      toolBtns: document.querySelectorAll('.tool-btn'),

      // Right Sidebar & Layers
      layersList: document.getElementById('layers-list'),
      layerBlendMode: document.getElementById('layer-blend-mode'),
      layerOpacitySlider: document.getElementById('layer-opacity-slider'),
      layerOpacityVal: document.getElementById('layer-opacity-val'),
      btnAddLayer: document.getElementById('btn-add-layer'),
      btnDuplicateLayer: document.getElementById('btn-duplicate-layer'),
      btnMoveLayerUp: document.getElementById('btn-move-layer-up'),
      btnMoveLayerDown: document.getElementById('btn-move-layer-down'),
      btnMergeDown: document.getElementById('btn-merge-down'),
      btnDeleteLayer: document.getElementById('btn-delete-layer'),

      // History
      historyList: document.getElementById('history-list'),
      btnClearHistory: document.getElementById('btn-clear-history'),

      // Filters
      filterBrightness: document.getElementById('filter-brightness'),
      filterContrast: document.getElementById('filter-contrast'),
      filterSaturation: document.getElementById('filter-saturation'),
      filterHue: document.getElementById('filter-hue'),
      filterExposure: document.getElementById('filter-exposure'),
      btnApplyColorAdjustments: document.getElementById('btn-apply-color-adjustments'),
      btnFilterSharpen: document.getElementById('btn-filter-sharpen'),
      btnFilterBlur: document.getElementById('btn-filter-blur'),
      btnFilterEdges: document.getElementById('btn-filter-edges'),
      btnFilterEmboss: document.getElementById('btn-filter-emboss'),
      btnFilterGrayscale: document.getElementById('btn-filter-grayscale'),
      btnFilterInvert: document.getElementById('btn-filter-invert'),
      btnFilterSepia: document.getElementById('btn-filter-sepia'),
      btnFilterVignette: document.getElementById('btn-filter-vignette'),
      btnFilterPixelate: document.getElementById('btn-filter-pixelate'),

      // Status Bar
      statusMessage: document.getElementById('status-message'),
      statusActiveLayer: document.getElementById('status-active-layer'),
      statusCursorCoords: document.getElementById('status-cursor-coords'),
      statusCanvasSize: document.getElementById('status-canvas-size'),
      statusWordCount: document.getElementById('status-word-count'),
      statusFps: document.getElementById('status-fps'),
      zoomSlider: document.getElementById('zoom-range-slider'),
      zoomPercentage: document.getElementById('status-zoom-percentage'),
      floatingZoomVal: document.getElementById('floating-zoom-val'),

      // Modals
      newCanvasModal: document.getElementById('new-canvas-modal'),
      shortcutsModal: document.getElementById('shortcuts-modal'),
      chartModal: document.getElementById('chart-modal'),
      tableModal: document.getElementById('table-modal'),
      findReplaceModal: document.getElementById('find-replace-modal'),
      exportModal: document.getElementById('export-modal'),
      textEditModal: document.getElementById('text-edit-modal'),
      textModalInput: document.getElementById('text-modal-input'),
      fileInput: document.getElementById('file-input'),
      slidePresetSelect: document.getElementById('slide-preset-select')
    };
  }

  initEngines() {
    this.viewport = new Viewport(this.dom.canvasStage, this.dom.canvasWrapper, {
      width: this.canvasWidth,
      height: this.canvasHeight
    });
    this.rulers = new Rulers(this.dom.rulerX, this.dom.rulerY, this.viewport);
    this.historyManager = new HistoryManager(50);
    this.layerManager = new LayerManager(this.dom.layerStack, this.canvasWidth, this.canvasHeight);
    this.layerManager.init('white');

    this.filterEngine = new FilterEngine(this.layerManager, this.historyManager);
    this.historyManager.pushState('New Canvas', () => this.layerManager.createSnapshot());

    this.selectionEngine = new SelectionEngine(
      this.dom.overlayCanvas,
      this.layerManager,
      this.historyManager,
      this.viewport
    );

    this.transformEngine = new TransformEngine(
      this.dom.overlayCanvas,
      this.layerManager,
      this.historyManager,
      this.viewport
    );

    this.vectorEngine = new VectorObjectEngine(
      this.dom.overlayCanvas,
      this.layerManager,
      this.historyManager,
      this.viewport
    );

    this.slideEngine = new SlideEngine(
      this.layerManager,
      this.vectorEngine,
      this.historyManager,
      this.viewport
    );

    this.chartEngine = new ChartEngine(
      this.layerManager,
      this.vectorEngine,
      this.historyManager
    );

    this.excelEngine = new ExcelEngine(
      this.layerManager,
      this.vectorEngine,
      this.historyManager
    );

    this.canvaWordEngine = new CanvaWordEngine(
      this.layerManager,
      this.vectorEngine,
      this.historyManager
    );

    this.paintBrushes = new PaintBrushes(
      this.layerManager,
      this.historyManager,
      this.viewport
    );

    this.exportEngine = new ExportEngine(
      this.layerManager,
      this.vectorEngine,
      this.slideEngine
    );

    this.toolManager = new ToolManager(
      this.dom.overlayCanvas,
      this.layerManager,
      this.viewport,
      this.historyManager,
      this.paintBrushes
    );

    // Live Render FPS Monitor
    this.fpsMeter = new FPSMeter('status-fps');

    // Multi-Tab Document Workspace Manager
    this.documentManager = new DocumentManager(
      this.dom.canvasTabsBar,
      (doc) => this.loadDocumentTab(doc),
      () => this.showModal('new-canvas-modal')
    );
    this.documentManager.initDefaultDoc(
      this.layerManager.createSnapshot(),
      this.vectorEngine.objects,
      this.slideEngine.slides,
      this.canvasWidth,
      this.canvasHeight
    );

    this.wireEngineCallbacks();
  }

  wireEngineCallbacks() {
    this.viewport.onTransformChange = (state) => {
      this.rulers.render();
      const pct = Math.round(state.zoom * 100);
      this.dom.zoomSlider.value = pct;
      this.dom.zoomPercentage.textContent = `${pct}%`;
      this.dom.floatingZoomVal.textContent = `${pct}%`;
    };

    this.layerManager.onLayersChange = () => {
      this.renderLayersUI();
      this.updateActiveLayerStatus();
    };

    this.historyManager.onStateChange = (state) => {
      this.renderHistoryUI(state);
      const undoBtn = document.getElementById('header-btn-undo');
      const redoBtn = document.getElementById('header-btn-redo');
      if (undoBtn) undoBtn.style.opacity = state.canUndo ? '1' : '0.4';
      if (redoBtn) redoBtn.style.opacity = state.canRedo ? '1' : '0.4';
    };

    this.toolManager.onColorPicked = (hex) => {
      this.setPrimaryColor(hex);
      this.updateStatusMessage(`Color sampled: ${hex}`);
    };

    this.toolManager.onToolChange = (tool) => {
      this.handleToolSelection(tool);
    };

    this.toolManager.onStatusUpdate = (msg, x, y) => {
      if (msg) this.updateStatusMessage(msg);
      if (x !== undefined && y !== undefined) {
        this.dom.statusCursorCoords.textContent = `${x}, ${y} px`;
        this.rulers.updateCursor(x, y);
      }
    };

    this.toolManager.onLayerAutoCreated = (newLayer) => {
      this.renderLayersUI();
      this.updateActiveLayerStatus();
      if (this.dom.moveLayerName) {
        this.dom.moveLayerName.textContent = newLayer.name;
      }
    };

    this.vectorEngine.onSelectionChange = (obj) => {
      if (obj && obj.type === 'text') {
        this.showContextBar('text');
        this.dom.textFontFamily.value = obj.fontFamily || 'Inter';
        this.dom.textFontSize.value = obj.fontSize || 36;
        this.dom.btnTextBold.classList.toggle('active', obj.fontWeight === 'bold' || obj.fontWeight === '700');
        this.dom.btnTextItalic.classList.toggle('active', obj.fontStyle === 'italic');
        this.dom.btnTextUnderline.classList.toggle('active', obj.textDecoration === 'underline');
        this.dom.btnTextStrike.classList.toggle('active', obj.strikethrough === true);
      } else if (!this.transformEngine.isTransforming) {
        if (this.toolManager.activeTool === 'shape') {
          this.showContextBar('shape');
        } else {
          this.showContextBar('brush');
        }
      }
      this.updateWordCount();
    };

    this.slideEngine.onSlidesChange = (slides, activeIndex) => {
      this.renderSlidesUI(slides, activeIndex);
    };
  }

  // Multi-Tab Document Switcher
  loadDocumentTab(doc) {
    this.canvasWidth = doc.width;
    this.canvasHeight = doc.height;
    this.projectName = doc.name;
    this.dom.statusCanvasSize.textContent = `${doc.width} x ${doc.height} px`;

    this.viewport.setCanvasSize(doc.width, doc.height);
    this.layerManager.restoreSnapshot(doc.snapshot);
    this.vectorEngine.objects = doc.objects || [];
    this.vectorEngine.render();
    this.viewport.centerInViewport();
    this.updateStatusMessage(`Switched to tab "${doc.name}"`);
  }

  // ==========================================
  // UI BINDINGS & ACCORDION SYSTEM
  // ==========================================

  bindUIEvents() {
    // Accordion Tool Dock Toggle
    this.dom.accordionHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const targetId = `acc-body-${header.dataset.accordion}`;
        const targetBody = document.getElementById(targetId);
        const isOpen = targetBody.classList.contains('active');

        // Toggle clicked
        header.classList.toggle('active', !isOpen);
        targetBody.classList.toggle('active', !isOpen);
      });
    });

    // Suite Mode Switcher
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.dataset.mode;
        this.updateStatusMessage(`Switched to ${tab.textContent.trim()} mode`);

        if (mode === 'slides') {
          this.dom.slidesDeckPanel.classList.remove('hidden');
          this.slideEngine.updateThumbnail(this.slideEngine.activeSlideIndex);
          this.renderSlidesUI(this.slideEngine.slides, this.slideEngine.activeSlideIndex);
        } else {
          this.dom.slidesDeckPanel.classList.add('hidden');
        }

        if (mode === 'photo') {
          this.switchSidebarTab('adjustments');
        } else if (mode === 'doc') {
          this.switchSidebarTab('assets');
        } else {
          this.switchSidebarTab('layers');
        }
      });
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchSidebarTab(btn.dataset.tab));
    });

    // Left Toolbox Selection
      this.dom.toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.extraAction) {
          this.runExtraAction(btn.dataset.extraAction);
          return;
        }
        const tool = btn.dataset.tool;
        if (tool === 'assets') {
          this.switchSidebarTab('assets');
          return;
        }
        if (tool === 'charts') {
          this.showModal('chart-modal');
          return;
        }
        this.toolManager.setTool(tool);
      });
    });

    // Stage Pointer Interactions
    this.bindStageInteractions();

    // Brush Sub-types
    this.dom.brushSubType.addEventListener('change', (e) => {
      this.paintBrushes.brushType = e.target.value;
      this.updateStatusMessage(`Brush style: ${e.target.options[e.target.selectedIndex].text}`);
    });

    this.dom.brushSize.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.toolManager.brushSize = val;
      this.dom.brushSizeVal.textContent = `${val}px`;
    });

    this.dom.brushOpacity.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.toolManager.brushOpacity = val / 100;
      this.dom.brushOpacityVal.textContent = `${val}%`;
    });

    this.dom.brushHardness.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.toolManager.brushHardness = val;
      this.dom.brushHardnessVal.textContent = `${val}%`;
    });

    const updateShapeSettings = (shape) => {
      const label = this.dom.shapesGridBtns && [...this.dom.shapesGridBtns].find((btn) => btn.dataset.shape === shape)?.title;
      this.dom.shapeSettingsTitle.textContent = `${label || shape} options`;
    };
    this.dom.shapeType.addEventListener('change', (e) => {
      this.toolManager.shapeType = e.target.value;
      this.dom.shapesGridBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.shape === e.target.value));
      updateShapeSettings(e.target.value);
    });

    this.dom.shapeCornerRadius.addEventListener('input', (e) => {
      this.toolManager.shapeCornerRadius = Number(e.target.value);
    });
    this.dom.shapeStarInner.addEventListener('input', (e) => {
      this.toolManager.shapeStarInnerRatio = Number(e.target.value) / 100;
    });
    this.dom.shapeCurveBend.addEventListener('input', (e) => {
      this.toolManager.shapeCurveBend = Number(e.target.value) / 100;
    });

    // Shape swatches are the primary shape picker in the Paint dock.  They
    // previously only changed their visual state, leaving the current tool
    // unchanged, so clicking a shape appeared to do nothing.
    this.dom.shapesGridBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const shape = btn.dataset.shape;
        if (!shape) return;

        this.dom.shapesGridBtns.forEach((item) => item.classList.toggle('active', item === btn));
        this.toolManager.shapeType = shape;
        this.dom.shapeType.value = shape;
        this.toolManager.setTool('shape');
        updateShapeSettings(shape);
        this.updateStatusMessage(`Shape selected: ${btn.title || shape}`);
      });
    });

    this.dom.shapeFillToggle.addEventListener('change', (e) => {
      this.toolManager.shapeFill = e.target.checked;
    });

    this.dom.shapeStrokeToggle.addEventListener('change', (e) => {
      this.toolManager.shapeStroke = e.target.checked;
    });

    const setAutoLayer = (enabled) => {
      this.toolManager.setAutoNewLayer(enabled);
      this.dom.btnToggleAutoLayer.classList.toggle('active', enabled);
      this.dom.statusAutoLayerChip.classList.toggle('active', enabled);
      this.dom.autoLayerText.textContent = `Auto-Layer: ${enabled ? 'ON' : 'OFF'}`;
      this.dom.statusAutoLayerChip.innerHTML = `<i class="fa-solid fa-layer-group"></i> Auto-Layer: ${enabled ? 'ON' : 'OFF'}`;
      this.updateStatusMessage(`Auto-Layer ${enabled ? 'enabled' : 'disabled'}`);
    };
    const toggleAutoLayer = () => setAutoLayer(!this.toolManager.autoNewLayerMode);
    this.dom.btnToggleAutoLayer.addEventListener('click', toggleAutoLayer);
    this.dom.statusAutoLayerChip.addEventListener('click', toggleAutoLayer);

    const syncCursorMode = () => {
      const precision = this.toolManager.capsLockCrosshair;
      this.dom.capsCursorText.textContent = precision ? 'Precision Cursor' : 'Circle Cursor';
      this.dom.statusCapsChip.classList.toggle('active', precision);
      this.dom.statusCapsChip.innerHTML = `<i class="fa-solid fa-${precision ? 'crosshairs' : 'circle-dot'}"></i> ${precision ? 'Precision' : 'Circle'}`;
    };
    const toggleCursorMode = () => {
      this.toolManager.toggleCapsLock();
      syncCursorMode();
    };
    this.dom.btnToggleCapsCursor.addEventListener('click', toggleCursorMode);
    this.dom.statusCapsChip.addEventListener('click', toggleCursorMode);
    this.dom.moveAutoSelect.addEventListener('change', (e) => {
      this.toolManager.autoSelectLayer = e.target.checked;
    });

    // Rich Text Controls
    this.dom.textFontFamily.addEventListener('change', (e) => {
      this.canvaWordEngine.formatActiveText({ fontFamily: e.target.value });
    });

    this.dom.textFontSize.addEventListener('input', (e) => {
      this.canvaWordEngine.formatActiveText({ fontSize: parseInt(e.target.value) || 32 });
    });

    this.dom.btnTextBold.addEventListener('click', () => {
      const sel = this.vectorEngine.getSelectedObject();
      if (sel && sel.type === 'text') {
        const next = sel.fontWeight === 'bold' ? 'normal' : 'bold';
        this.canvaWordEngine.formatActiveText({ fontWeight: next });
        this.dom.btnTextBold.classList.toggle('active', next === 'bold');
      }
    });

    this.dom.btnTextItalic.addEventListener('click', () => {
      const sel = this.vectorEngine.getSelectedObject();
      if (sel && sel.type === 'text') {
        const next = sel.fontStyle === 'italic' ? 'normal' : 'italic';
        this.canvaWordEngine.formatActiveText({ fontStyle: next });
        this.dom.btnTextItalic.classList.toggle('active', next === 'italic');
      }
    });

    this.dom.btnTextUnderline.addEventListener('click', () => {
      const sel = this.vectorEngine.getSelectedObject();
      if (sel && sel.type === 'text') {
        const next = sel.textDecoration === 'underline' ? 'none' : 'underline';
        this.canvaWordEngine.formatActiveText({ textDecoration: next });
        this.dom.btnTextUnderline.classList.toggle('active', next === 'underline');
      }
    });

    this.dom.btnTextStrike.addEventListener('click', () => {
      const sel = this.vectorEngine.getSelectedObject();
      if (sel && sel.type === 'text') {
        const next = !sel.strikethrough;
        this.canvaWordEngine.formatActiveText({ strikethrough: next });
        this.dom.btnTextStrike.classList.toggle('active', next);
      }
    });

    this.dom.btnTextAlignLeft.addEventListener('click', () => this.setTextAlignment('left'));
    this.dom.btnTextAlignCenter.addEventListener('click', () => this.setTextAlignment('center'));
    this.dom.btnTextAlignRight.addEventListener('click', () => this.setTextAlignment('right'));

    this.dom.btnTextCurvedToggle.addEventListener('click', () => {
      const sel = this.vectorEngine.getSelectedObject();
      if (sel && sel.type === 'text') {
        sel.isCurved = !sel.isCurved;
        this.vectorEngine.render();
        this.updateStatusMessage(sel.isCurved ? 'Curved Arc Text activated' : 'Standard horizontal text');
      }
    });

    this.dom.btnTextEditContent.addEventListener('click', () => {
      const sel = this.vectorEngine.getSelectedObject();
      if (sel && sel.type === 'text') {
        this.dom.textModalInput.value = sel.text;
        this.showModal('text-edit-modal');
      }
    });

    document.getElementById('btn-text-modal-apply').addEventListener('click', () => {
      const sel = this.vectorEngine.getSelectedObject();
      if (sel && sel.type === 'text') {
        sel.text = this.dom.textModalInput.value;
        this.vectorEngine.render();
        this.updateWordCount();
      }
      this.hideModal('text-edit-modal');
    });
    document.getElementById('btn-text-modal-close').addEventListener('click', () => this.hideModal('text-edit-modal'));
    document.getElementById('btn-text-modal-cancel').addEventListener('click', () => this.hideModal('text-edit-modal'));

    // Free Transform Buttons
    this.dom.btnApplyTransform.addEventListener('click', () => {
      this.transformEngine.applyTransform();
      this.showContextBar('brush');
    });
    this.dom.btnCancelTransform.addEventListener('click', () => {
      this.transformEngine.cancelTransform();
      this.showContextBar('brush');
    });

    // Colors
    this.dom.primarySwatch.parentElement.addEventListener('click', (e) => {
      if (e.target === this.dom.secondarySwatch) this.dom.secondaryPicker.click();
      else this.dom.primaryPicker.click();
    });
    this.dom.primaryPicker.addEventListener('input', (e) => this.setPrimaryColor(e.target.value));
    this.dom.secondaryPicker.addEventListener('input', (e) => this.setSecondaryColor(e.target.value));
    this.dom.swapColorsBtn.addEventListener('click', () => {
      this.toolManager.swapColors();
      this.syncColorDisplays();
    });
    this.dom.resetColorsBtn.addEventListener('click', () => {
      this.toolManager.resetColors();
      this.syncColorDisplays();
    });

    document.querySelectorAll('.palette-dot').forEach(dot => {
      dot.addEventListener('click', () => this.setPrimaryColor(dot.dataset.color));
    });

    // Layer System Actions
    this.dom.btnAddLayer.addEventListener('click', () => {
      this.layerManager.addLayer();
      this.historyManager.pushState('New Layer', () => this.layerManager.createSnapshot());
    });
    this.dom.btnDuplicateLayer.addEventListener('click', () => {
      this.layerManager.duplicateActiveLayer();
      this.historyManager.pushState('Duplicate Layer', () => this.layerManager.createSnapshot());
    });
    this.dom.btnMoveLayerUp.addEventListener('click', () => this.layerManager.moveActiveLayer(1));
    this.dom.btnMoveLayerDown.addEventListener('click', () => this.layerManager.moveActiveLayer(-1));
    this.dom.btnMergeDown.addEventListener('click', () => {
      this.layerManager.mergeDown();
      this.historyManager.pushState('Merge Down', () => this.layerManager.createSnapshot());
    });
    this.dom.btnDeleteLayer.addEventListener('click', () => {
      if (this.layerManager.deleteActiveLayer()) {
        this.historyManager.pushState('Delete Layer', () => this.layerManager.createSnapshot());
      }
    });

    this.dom.layerBlendMode.addEventListener('change', (e) => {
      const active = this.layerManager.getActiveLayer();
      if (active) {
        this.layerManager.setLayerBlendMode(active.id, e.target.value);
        this.historyManager.pushState(`Blend: ${e.target.value}`, () => this.layerManager.createSnapshot());
      }
    });

    this.dom.layerOpacitySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.dom.layerOpacityVal.textContent = `${val}%`;
      const active = this.layerManager.getActiveLayer();
      if (active) {
        this.layerManager.setLayerOpacity(active.id, val / 100);
      }
    });

    // History Timeline
    document.getElementById('header-btn-undo').addEventListener('click', () => this.triggerUndo());
    document.getElementById('header-btn-redo').addEventListener('click', () => this.triggerRedo());
    this.dom.btnClearHistory.addEventListener('click', () => this.historyManager.clear());

    // Top Menu Bar Actions
    document.getElementById('action-new').addEventListener('click', () => this.showModal('new-canvas-modal'));
    document.getElementById('action-open').addEventListener('click', () => this.dom.fileInput.click());
    document.getElementById('action-save-json').addEventListener('click', () => this.saveProjectJSON());
    document.getElementById('action-export-png').addEventListener('click', () => this.showModal('export-modal'));
    document.getElementById('action-export-jpg').addEventListener('click', () => this.exportEngine.exportJPEG(this.projectName, 2));
    document.getElementById('action-export-webp').addEventListener('click', () => this.exportEngine.exportWebP(this.projectName, 2));
    document.getElementById('action-export-svg').addEventListener('click', () => this.exportEngine.exportSVG(this.projectName));
    document.getElementById('action-export-pdf').addEventListener('click', () => this.exportEngine.exportMultiPagePDF(`${this.projectName}.pdf`));
    document.getElementById('action-print').addEventListener('click', () => this.exportEngine.openPrintStudio());
    document.getElementById('header-btn-export').addEventListener('click', () => this.showModal('export-modal'));
    document.getElementById('header-btn-present').addEventListener('click', () => this.slideEngine.startPresentation());

    // Edit Menu
    document.getElementById('menu-undo').addEventListener('click', () => this.triggerUndo());
    document.getElementById('menu-redo').addEventListener('click', () => this.triggerRedo());
    document.getElementById('menu-cut').addEventListener('click', () => this.selectionEngine.cutSelection());
    document.getElementById('menu-copy').addEventListener('click', () => this.selectionEngine.copySelection());
    document.getElementById('menu-paste').addEventListener('click', () => this.selectionEngine.pasteSelection());
    document.getElementById('menu-free-transform').addEventListener('click', () => this.triggerFreeTransform());
    document.getElementById('menu-find-replace').addEventListener('click', () => this.showModal('find-replace-modal'));
    document.getElementById('menu-select-all').addEventListener('click', () => this.selectionEngine.selectAll());
    document.getElementById('menu-deselect').addEventListener('click', () => this.selectionEngine.deselect());
    document.getElementById('menu-clear-layer').addEventListener('click', () => {
      this.layerManager.clearActiveLayer();
      this.historyManager.pushState('Clear Layer', () => this.layerManager.createSnapshot());
    });
    document.getElementById('menu-fill-layer').addEventListener('click', () => {
      this.layerManager.fillActiveLayer(this.toolManager.primaryColor);
      this.historyManager.pushState('Fill Layer', () => this.layerManager.createSnapshot());
    });

    // Image Menu
    document.getElementById('menu-resize-canvas').addEventListener('click', () => this.showModal('new-canvas-modal'));
    document.getElementById('menu-crop-canvas').addEventListener('click', () => this.viewport.centerInViewport());
    document.getElementById('menu-flip-h').addEventListener('click', () => {
      this.layerManager.flipLayer(true);
      this.historyManager.pushState('Flip Horizontal', () => this.layerManager.createSnapshot());
    });
    document.getElementById('menu-flip-v').addEventListener('click', () => {
      this.layerManager.flipLayer(false);
      this.historyManager.pushState('Flip Vertical', () => this.layerManager.createSnapshot());
    });
    document.getElementById('menu-rotate-cw').addEventListener('click', () => {
      this.layerManager.rotateActiveLayer90();
      this.historyManager.pushState('Rotate 90°', () => this.layerManager.createSnapshot());
    });
    document.getElementById('menu-bg-remove').addEventListener('click', () => this.canvaWordEngine.removeBackground(35));
    document.getElementById('menu-extract-palette').addEventListener('click', () => this.extractPaletteToDock());

    // Layer Menu
    document.getElementById('menu-new-layer').addEventListener('click', () => this.dom.btnAddLayer.click());
    document.getElementById('menu-duplicate-layer').addEventListener('click', () => this.dom.btnDuplicateLayer.click());
    document.getElementById('menu-delete-layer').addEventListener('click', () => this.dom.btnDeleteLayer.click());
    document.getElementById('menu-add-mask').addEventListener('click', () => this.layerManager.addLayerMask());
    document.getElementById('menu-clip-mask').addEventListener('click', () => this.layerManager.toggleClippingMask());
    document.getElementById('menu-frame-mask').addEventListener('click', () => this.canvaWordEngine.applyImageFrameMask('circle'));
    document.getElementById('menu-merge-down').addEventListener('click', () => this.dom.btnMergeDown.click());
    document.getElementById('menu-flatten').addEventListener('click', () => {
      this.layerManager.flattenImage();
      this.historyManager.pushState('Flatten Image', () => this.layerManager.createSnapshot());
    });
    document.getElementById('menu-burn-vectors').addEventListener('click', () => this.vectorEngine.burnToActiveLayer());

    // Insert Menu
    document.getElementById('action-insert-text').addEventListener('click', () => this.vectorEngine.addTextObject());
    document.getElementById('action-insert-chart').addEventListener('click', () => this.showModal('chart-modal'));
    document.getElementById('action-insert-table').addEventListener('click', () => this.showModal('table-modal'));
    document.getElementById('action-insert-badge').addEventListener('click', () => this.vectorEngine.addShapeObject('badge'));
    document.getElementById('action-insert-sticker').addEventListener('click', () => this.switchSidebarTab('assets'));

    // View Menu
    document.getElementById('menu-zoom-in').addEventListener('click', () => this.viewport.zoomIn());
    document.getElementById('menu-zoom-out').addEventListener('click', () => this.viewport.zoomOut());
    document.getElementById('menu-zoom-100').addEventListener('click', () => this.viewport.resetZoom100());
    document.getElementById('menu-zoom-fit').addEventListener('click', () => this.viewport.centerInViewport());

    document.getElementById('toggle-grid').addEventListener('change', (e) => {
      this.dom.canvasStage.style.backgroundImage = e.target.checked
        ? 'radial-gradient(#20232c 1.2px, transparent 1.2px)'
        : 'none';
    });

    document.getElementById('toggle-rulers').addEventListener('change', (e) => {
      this.rulers.setVisible(e.target.checked);
    });

    document.getElementById('btn-zoom-fit-quick').addEventListener('click', () => this.viewport.centerInViewport());
    document.getElementById('btn-zoom-100-quick').addEventListener('click', () => this.viewport.resetZoom100());

    this.dom.zoomSlider.addEventListener('input', (e) => {
      const pct = parseInt(e.target.value);
      this.viewport.setZoom(pct / 100);
    });

    document.getElementById('btn-zoom-in-status').addEventListener('click', () => this.viewport.zoomIn());
    document.getElementById('btn-zoom-out-status').addEventListener('click', () => this.viewport.zoomOut());
    document.getElementById('btn-status-shortcuts').addEventListener('click', () => this.showModal('shortcuts-modal'));

    // File Input
    this.dom.fileInput.addEventListener('change', (e) => this.handleFileImport(e));

    // Canva Stickers Click
    document.querySelectorAll('.asset-item').forEach(item => {
      item.addEventListener('click', () => {
        this.vectorEngine.addStickerObject(item.dataset.sticker);
        this.updateStatusMessage(`Added sticker ${item.dataset.sticker}`);
      });
    });

    document.getElementById('btn-asset-badge').addEventListener('click', () => this.vectorEngine.addShapeObject('badge'));
    document.getElementById('btn-asset-heart').addEventListener('click', () => this.vectorEngine.addShapeObject('heart'));
    document.getElementById('btn-asset-arrow').addEventListener('click', () => this.vectorEngine.addShapeObject('arrow-right'));
    document.getElementById('btn-asset-text').addEventListener('click', () => this.vectorEngine.addTextObject('YOUR HEADLINE HERE', { fontSize: 48, fontWeight: '700' }));
    document.getElementById('btn-canva-bg-remover').addEventListener('click', () => this.canvaWordEngine.removeBackground(35));
    document.getElementById('btn-canva-extract-palette').addEventListener('click', () => this.extractPaletteToDock());

    document.getElementById('btn-obj-front').addEventListener('click', () => this.vectorEngine.bringToFront());
    document.getElementById('btn-obj-back').addEventListener('click', () => this.vectorEngine.sendToBack());
    document.getElementById('btn-obj-delete').addEventListener('click', () => this.vectorEngine.deleteSelected());

    // PowerPoint Controls
    document.getElementById('btn-slide-add').addEventListener('click', () => this.slideEngine.addSlide());
    document.getElementById('btn-slide-dup').addEventListener('click', () => this.slideEngine.duplicateSlide(this.slideEngine.activeSlideIndex));
    document.getElementById('btn-slide-del').addEventListener('click', () => this.slideEngine.deleteSlide(this.slideEngine.activeSlideIndex));
    document.getElementById('btn-slide-present').addEventListener('click', () => this.slideEngine.startPresentation());
    this.dom.slidePresetSelect.addEventListener('change', (e) => this.slideEngine.setSlidePreset(e.target.value));

    // Find and Replace Modal
    document.getElementById('btn-find-close').addEventListener('click', () => this.hideModal('find-replace-modal'));
    document.getElementById('btn-find-cancel').addEventListener('click', () => this.hideModal('find-replace-modal'));
    document.getElementById('btn-find-submit').addEventListener('click', () => {
      const find = document.getElementById('find-input').value;
      const repl = document.getElementById('replace-input').value;
      const matchCase = document.getElementById('find-match-case').checked;
      const replaced = this.canvaWordEngine.findAndReplace(find, repl, matchCase);
      this.updateStatusMessage(`Replaced ${replaced} occurrences of "${find}"`);
      this.hideModal('find-replace-modal');
    });

    // Excel Table Modal
    document.getElementById('btn-table-close').addEventListener('click', () => this.hideModal('table-modal'));
    document.getElementById('btn-table-cancel').addEventListener('click', () => this.hideModal('table-modal'));
    document.getElementById('btn-table-generate').addEventListener('click', () => {
      const theme = document.getElementById('table-theme-select').value;
      const headers = document.getElementById('table-headers-input').value.split(',').map(s => s.trim());
      const rows = document.getElementById('table-rows-input').value.split('\n').filter(l => l.trim()).map(line => line.split(',').map(c => c.trim()));

      this.excelEngine.createSpreadsheetObject({ headers, rows, theme });
      this.hideModal('table-modal');
      this.updateStatusMessage('Dynamic spreadsheet table inserted');
    });

    // Chart Modal
    document.getElementById('btn-chart-close').addEventListener('click', () => this.hideModal('chart-modal'));
    document.getElementById('btn-chart-cancel').addEventListener('click', () => this.hideModal('chart-modal'));
    document.getElementById('btn-chart-generate').addEventListener('click', () => {
      const type = document.getElementById('chart-type-select').value;
      const title = document.getElementById('chart-title-input').value;
      const labels = document.getElementById('chart-labels-input').value.split(',').map(s => s.trim());
      const values = document.getElementById('chart-values-input').value.split(',').map(s => parseFloat(s.trim()) || 0);

      this.chartEngine.createChart({ type, title, labels, values });
      this.hideModal('chart-modal');
      this.updateStatusMessage(`Inserted ${type} chart: ${title}`);
    });

    // Export Modal
    document.getElementById('btn-export-close').addEventListener('click', () => this.hideModal('export-modal'));
    document.getElementById('btn-export-cancel').addEventListener('click', () => this.hideModal('export-modal'));
    document.getElementById('btn-export-confirm').addEventListener('click', () => {
      const fmt = document.getElementById('export-format-select').value;
      const scale = parseInt(document.querySelector('input[name="export-scale"]:checked').value) || 1;

      if (fmt === 'png') this.exportEngine.exportPNG(this.projectName, scale);
      else if (fmt === 'jpeg') this.exportEngine.exportJPEG(this.projectName, scale, 0.95);
      else if (fmt === 'webp') this.exportEngine.exportWebP(this.projectName, scale, 0.92);
      else if (fmt === 'svg') this.exportEngine.exportSVG(this.projectName);
      else if (fmt === 'pdf') this.exportEngine.exportMultiPagePDF(`${this.projectName}.pdf`);
      else if (fmt === 'json') this.saveProjectJSON();

      this.hideModal('export-modal');
    });

    this.setupFilters();
    this.setupModals();
  }

  // ==========================================
  // STAGE POINTER INTERACTION ROUTER
  // ==========================================

  bindStageInteractions() {
    const stage = this.dom.canvasStage;
    let isMouseDown = false;
    let dragStart = { x: 0, y: 0 };

    stage.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isMouseDown = true;
      const { x, y, inBounds } = this.viewport.screenToCanvas(e.clientX, e.clientY);
      if (!inBounds) {
        isMouseDown = false;
        return;
      }
      dragStart = { x, y };

      // 1. Transform Handles
      if (this.transformEngine.isTransforming) {
        if (this.transformEngine.onPointerDown(x, y, e)) {
          e.stopImmediatePropagation();
          return;
        }
      }

      // 2. Clone Stamp
      if (this.toolManager.activeTool === 'clone') {
        if (e.altKey) {
          this.paintBrushes.setCloneSource(x, y);
          this.updateStatusMessage(`Clone source set at (${x}, ${y})`);
          e.stopImmediatePropagation();
          return;
        } else {
          this.paintBrushes.applyCloneStamp(x, y, this.toolManager.brushSize, this.toolManager.brushOpacity);
          this.layerManager.notify();
          e.stopImmediatePropagation();
          return;
        }
      }

      // 3. Retouching Tools
      const retouchMap = {
        'spot-healing': 'spot',
        'dodge': 'dodge',
        'burn': 'burn',
        'blur-tool': 'blur',
        'sharpen-tool': 'sharpen',
        'smudge': 'smudge'
      };

      if (retouchMap[this.toolManager.activeTool]) {
        if (this.toolManager.activeTool === 'spot-healing') {
          this.paintBrushes.applySpotHealing(x, y, this.toolManager.brushSize);
        } else {
          this.paintBrushes.applyRetouchTool(retouchMap[this.toolManager.activeTool], x, y, this.toolManager.brushSize);
        }
        this.layerManager.notify();
        e.stopImmediatePropagation();
        return;
      }

      // 4. Selection Tools
      if (['marquee', 'marquee-ellipse', 'lasso', 'poly-lasso', 'magnetic-lasso', 'quick-select', 'wand'].includes(this.toolManager.activeTool)) {
        if (this.toolManager.activeTool === 'wand') {
          this.selectionEngine.selectMagicWand(x, y, 32, true);
        } else {
          this.selectionEngine.startSelection(this.toolManager.activeTool, x, y);
        }
        e.stopImmediatePropagation();
        return;
      }

      // 5. Vector & Text Objects
      if (this.toolManager.activeTool === 'select' || this.toolManager.activeTool === 'text') {
        if (this.vectorEngine.onPointerDown(x, y)) {
          e.stopImmediatePropagation();
          return;
        }
      }
    }, true);

    window.addEventListener('mousemove', (e) => {
      const { x, y } = this.viewport.screenToCanvas(e.clientX, e.clientY);

      if (this.transformEngine.isTransforming) {
        this.transformEngine.onPointerMove(x, y, e.shiftKey);
      }

      if (this.selectionEngine.isSelecting) {
        this.selectionEngine.updateSelection(x, y);
      }

      if (this.vectorEngine.activeAction) {
        this.vectorEngine.onPointerMove(x, y, e.shiftKey);
      }

      if (isMouseDown) {
        if (['dodge', 'burn', 'blur-tool', 'sharpen-tool', 'smudge'].includes(this.toolManager.activeTool)) {
          const toolName = this.toolManager.activeTool.replace('-tool', '');
          this.paintBrushes.applyRetouchTool(toolName, x, y, this.toolManager.brushSize);
          this.layerManager.notify();
        } else if (this.toolManager.activeTool === 'clone' && !e.altKey) {
          this.paintBrushes.applyCloneStamp(x, y, this.toolManager.brushSize, this.toolManager.brushOpacity);
          this.layerManager.notify();
        }
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (!isMouseDown) return;
      isMouseDown = false;
      const { x, y } = this.viewport.screenToCanvas(e.clientX, e.clientY);

      if (this.transformEngine.isTransforming) {
        this.transformEngine.onPointerUp();
      }

      if (this.selectionEngine.isSelecting) {
        this.selectionEngine.finishSelection(x, y);
      }

      if (this.vectorEngine.activeAction) {
        this.vectorEngine.onPointerUp();
      }

      if (this.toolManager.activeTool === 'gradient') {
        const active = this.layerManager.getActiveLayer();
        if (active && !active.locked) {
          this.paintBrushes.applyGradient(active.ctx, dragStart.x, dragStart.y, x, y, this.toolManager.primaryColor, this.toolManager.secondaryColor);
        }
      }
    });
  }

  runExtraAction(action) {
    switch (action) {
      case 'free-transform':
        this.triggerFreeTransform();
        break;
      case 'remove-background':
        this.canvaWordEngine.removeBackground(35);
        break;
      case 'extract-palette':
        this.extractPaletteToDock();
        break;
      case 'insert-text':
        this.toolManager.setTool('text');
        break;
      case 'insert-table':
        this.showModal('table-modal');
        break;
      case 'insert-chart':
        this.showModal('chart-modal');
        break;
      case 'fill-layer':
        this.layerManager.fillActiveLayer(this.toolManager.primaryColor);
        this.historyManager.pushState('Fill Layer', () => this.layerManager.createSnapshot());
        break;
      case 'clear-layer':
        this.layerManager.clearActiveLayer();
        this.historyManager.pushState('Clear Layer', () => this.layerManager.createSnapshot());
        break;
      default:
        return;
    }
    this.updateStatusMessage(`Extra tool: ${action.replace('-', ' ')}`);
  }

  handleToolSelection(tool) {
    this.dom.toolBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tool === tool));

    if (tool === 'text') {
      this.showContextBar('text');
      this.vectorEngine.addTextObject();
    } else if (tool === 'shape') {
      this.showContextBar('shape');
    } else if (['brush', 'pencil', 'eraser', 'clone', 'dodge', 'burn', 'blur-tool', 'sharpen-tool', 'smudge', 'spot-healing'].includes(tool)) {
      this.showContextBar('brush');
    }

    const toolNames = {
      brush: 'Paint Brush',
      pencil: 'Pencil',
      eraser: 'Eraser',
      bucket: 'Paint Bucket',
      gradient: 'Gradient Tool',
      eyedropper: 'Eyedropper',
      clone: 'Clone Stamp',
      'spot-healing': 'Spot Healing',
      dodge: 'Dodge (Lighten)',
      burn: 'Burn (Darken)',
      'blur-tool': 'Blur Retouch',
      'sharpen-tool': 'Sharpen Retouch',
      smudge: 'Smudge Tool',
      shape: 'Shapes Library',
      text: 'Word Rich Text',
      hand: 'Hand / Pan',
      zoom: 'Zoom',
      select: 'Select & Move',
      marquee: 'Marquee Selection',
      'marquee-ellipse': 'Elliptical Marquee',
      lasso: 'Freehand Lasso',
      'poly-lasso': 'Polygonal Lasso',
      'magnetic-lasso': 'Magnetic Lasso',
      'quick-select': 'Quick Selection',
      wand: 'Magic Wand'
    };

    this.dom.ctxToolName.textContent = toolNames[tool] || tool;
    this.updateStatusMessage(`Active: ${toolNames[tool] || tool}`);
  }

  showContextBar(type) {
    this.dom.ctxBrushSettings.classList.toggle('hidden', type !== 'brush');
    this.dom.ctxShapeSettings.classList.toggle('hidden', type !== 'shape');
    this.dom.ctxTextSettings.classList.toggle('hidden', type !== 'text');
    this.dom.ctxTransformSettings.classList.toggle('hidden', type !== 'transform');
  }

  setTextAlignment(align) {
    this.canvaWordEngine.formatActiveText({ textAlign: align });
    this.dom.btnTextAlignLeft.classList.toggle('active', align === 'left');
    this.dom.btnTextAlignCenter.classList.toggle('active', align === 'center');
    this.dom.btnTextAlignRight.classList.toggle('active', align === 'right');
  }

  triggerFreeTransform() {
    if (this.transformEngine.startTransform()) {
      this.showContextBar('transform');
      this.updateStatusMessage('Free Transform active. Drag handles to scale/rotate. Press Enter to commit.');
    }
  }

  updateWordCount() {
    const stats = this.canvaWordEngine.getWordCountStats();
    this.dom.statusWordCount.innerHTML = `<i class="fa-solid fa-font"></i> Words: ${stats.words} | Chars: ${stats.chars}`;
  }

  extractPaletteToDock() {
    const colors = this.canvaWordEngine.extractColorPalette(8);
    const dock = this.dom.quickPaletteDock;
    dock.innerHTML = '';
    colors.forEach(hex => {
      const dot = document.createElement('span');
      dot.className = 'palette-dot';
      dot.style.backgroundColor = hex;
      dot.dataset.color = hex;
      dot.addEventListener('click', () => this.setPrimaryColor(hex));
      dock.appendChild(dot);
    });
    this.updateStatusMessage(`Extracted ${colors.length} palette swatches from artwork`);
  }

  // ==========================================
  // FILTERS & ADJUSTMENTS
  // ==========================================

  setupFilters() {
    this.dom.btnApplyColorAdjustments.addEventListener('click', () => {
      this.filterEngine.applyAdjustments({
        brightness: parseInt(this.dom.filterBrightness.value) || 0,
        contrast: parseInt(this.dom.filterContrast.value) || 0,
        saturation: parseInt(this.dom.filterSaturation.value) || 0,
        hue: parseInt(this.dom.filterHue.value) || 0,
        exposure: parseInt(this.dom.filterExposure.value) || 0
      });
      this.updateStatusMessage('Adjustments baked into active layer');
    });

    this.dom.btnFilterSharpen.addEventListener('click', () => this.filterEngine.sharpen());
    this.dom.btnFilterBlur.addEventListener('click', () => this.filterEngine.gaussianBlur(3));
    this.dom.btnFilterEdges.addEventListener('click', () => this.filterEngine.edgeDetection());
    this.dom.btnFilterEmboss.addEventListener('click', () => this.filterEngine.emboss());
    this.dom.btnFilterGrayscale.addEventListener('click', () => this.applyFilterPixelOp('grayscale'));
    this.dom.btnFilterInvert.addEventListener('click', () => this.applyFilterPixelOp('invert'));
    this.dom.btnFilterSepia.addEventListener('click', () => this.applyFilterPixelOp('sepia'));
    this.dom.btnFilterVignette.addEventListener('click', () => this.filterEngine.vignette(0.6));
    this.dom.btnFilterPixelate.addEventListener('click', () => this.filterEngine.pixelate(12));
  }

  applyFilterPixelOp(type) {
    const layer = this.layerManager.getActiveLayer();
    if (!layer || layer.locked) return;

    const ctx = layer.ctx;
    const w = this.layerManager.width;
    const h = this.layerManager.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (type === 'grayscale') {
        const avg = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = data[i + 1] = data[i + 2] = avg;
      } else if (type === 'invert') {
        data[i] = 255 - r;
        data[i + 1] = 255 - g;
        data[i + 2] = 255 - b;
      } else if (type === 'sepia') {
        data[i] = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
        data[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
        data[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
      }
    }

    ctx.putImageData(imgData, 0, 0);
    this.layerManager.notify();
    this.historyManager.pushState(`Filter: ${type}`, () => this.layerManager.createSnapshot());
    this.updateStatusMessage(`Applied ${type}`);
  }

  // ==========================================
  // SHORTCUTS
  // ==========================================

  bindShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (e.key === 'F5') {
        e.preventDefault();
        this.slideEngine.startPresentation();
        return;
      }

      if (ctrl && e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) this.triggerRedo();
        else this.triggerUndo();
      } else if (ctrl && e.code === 'KeyY') {
        e.preventDefault();
        this.triggerRedo();
      } else if (ctrl && e.code === 'KeyT') {
        e.preventDefault();
        this.triggerFreeTransform();
      } else if (ctrl && e.code === 'KeyF') {
        e.preventDefault();
        this.showModal('find-replace-modal');
      } else if (ctrl && e.code === 'KeyC') {
        e.preventDefault();
        this.selectionEngine.copySelection();
        this.updateStatusMessage('Selection copied');
      } else if (ctrl && e.code === 'KeyX') {
        e.preventDefault();
        this.selectionEngine.cutSelection();
        this.updateStatusMessage('Selection cut');
      } else if (ctrl && e.code === 'KeyV') {
        e.preventDefault();
        this.selectionEngine.pasteSelection();
        this.updateStatusMessage('Pasted as new layer');
      } else if (ctrl && e.code === 'KeyD') {
        e.preventDefault();
        this.selectionEngine.deselect();
        this.vectorEngine.deselect();
      } else if (e.code === 'Enter' && this.transformEngine.isTransforming) {
        e.preventDefault();
        this.transformEngine.applyTransform();
        this.showContextBar('brush');
      } else if (e.code === 'Escape') {
        if (this.transformEngine.isTransforming) {
          this.transformEngine.cancelTransform();
          this.showContextBar('brush');
        } else {
          this.selectionEngine.deselect();
          this.vectorEngine.deselect();
        }
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (this.vectorEngine.getSelectedObject()) {
          this.vectorEngine.deleteSelected();
        } else if (this.selectionEngine.hasSelection) {
          this.selectionEngine.deleteSelectionContent();
        }
      } else if (ctrl && e.shiftKey && e.code === 'KeyN') {
        e.preventDefault();
        this.dom.btnAddLayer.click();
      } else if (ctrl && e.code === 'KeyJ') {
        e.preventDefault();
        this.dom.btnDuplicateLayer.click();
      } else if (ctrl && e.code === 'KeyS') {
        e.preventDefault();
        this.saveProjectJSON();
      } else if (ctrl && e.code === 'KeyO') {
        e.preventDefault();
        this.dom.fileInput.click();
      } else if (ctrl && e.code === 'KeyP') {
        e.preventDefault();
        this.exportEngine.openPrintStudio();
      } else if (ctrl && (e.code === 'Digit0' || e.code === 'Numpad0')) {
        e.preventDefault();
        this.viewport.resetZoom100();
      } else if (e.code === 'KeyB') {
        this.toolManager.setTool('brush');
      } else if (e.code === 'KeyP') {
        this.toolManager.setTool('pencil');
      } else if (e.code === 'KeyE') {
        this.toolManager.setTool('eraser');
      } else if (e.code === 'KeyG') {
        this.toolManager.setTool('bucket');
      } else if (e.code === 'KeyS') {
        this.toolManager.setTool('clone');
      } else if (e.code === 'KeyI') {
        this.toolManager.setTool('eyedropper');
      } else if (e.code === 'KeyU') {
        this.toolManager.setTool('shape');
      } else if (e.code === 'KeyT') {
        this.toolManager.setTool('text');
      } else if (e.code === 'KeyV') {
        this.toolManager.setTool('select');
      } else if (e.code === 'KeyM') {
        this.toolManager.setTool('marquee');
      } else if (e.code === 'KeyL') {
        this.toolManager.setTool('lasso');
      } else if (e.code === 'KeyW') {
        this.toolManager.setTool('wand');
      } else if (e.code === 'KeyH') {
        this.toolManager.setTool('hand');
      } else if (e.code === 'KeyZ' && !ctrl) {
        this.toolManager.setTool('zoom');
      } else if (e.code === 'KeyX') {
        this.toolManager.swapColors();
        this.syncColorDisplays();
      } else if (e.code === 'KeyD') {
        this.toolManager.resetColors();
        this.syncColorDisplays();
      }
    });
  }

  // ==========================================
  // RENDERING & HELPERS
  // ==========================================

  renderSlidesUI(slides, activeIndex) {
    const strip = this.dom.slidesStrip;
    strip.innerHTML = '';

    slides.forEach((s, idx) => {
      const card = document.createElement('div');
      card.className = `slide-card ${idx === activeIndex ? 'active' : ''}`;
      card.innerHTML = `
        <span class="slide-badge-num">${idx + 1}</span>
        <img class="slide-thumb-img" src="${s.thumbDataUrl || ''}" />
      `;
      card.addEventListener('click', () => {
        this.slideEngine.switchSlide(idx);
      });
      strip.appendChild(card);
    });
  }

  switchSidebarTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.sidebar-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
  }

  setPrimaryColor(hex) {
    this.toolManager.setPrimaryColor(hex);
    this.syncColorDisplays();
  }

  setSecondaryColor(hex) {
    this.toolManager.setSecondaryColor(hex);
    this.syncColorDisplays();
  }

  syncColorDisplays() {
    this.dom.primarySwatch.style.backgroundColor = this.toolManager.primaryColor;
    this.dom.secondarySwatch.style.backgroundColor = this.toolManager.secondaryColor;
    this.dom.primaryPicker.value = this.toolManager.primaryColor;
    this.dom.secondaryPicker.value = this.toolManager.secondaryColor;
  }

  renderLayersUI() {
    const list = this.dom.layersList;
    list.innerHTML = '';
    const reversed = [...this.layerManager.layers].reverse();

    reversed.forEach(layer => {
      const item = document.createElement('div');
      item.className = `layer-item ${layer.id === this.layerManager.activeLayerId ? 'active' : ''}`;

      const visBtn = document.createElement('button');
      visBtn.className = `layer-vis-btn ${layer.visible ? 'visible' : ''}`;
      visBtn.innerHTML = layer.visible ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
      visBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.layerManager.setLayerVisibility(layer.id, !layer.visible);
      });

      const lockBtn = document.createElement('button');
      lockBtn.className = `layer-lock-btn ${layer.locked ? 'locked' : ''}`;
      lockBtn.innerHTML = layer.locked ? '<i class="fa-solid fa-lock"></i>' : '<i class="fa-solid fa-lock-open"></i>';
      lockBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.layerManager.setLayerLock(layer.id, !layer.locked);
      });

      const thumb = document.createElement('img');
      thumb.className = 'layer-thumb-preview';
      thumb.src = layer.thumbCanvas ? layer.thumbCanvas.toDataURL() : '';

      const title = document.createElement('span');
      title.className = 'layer-title-text';
      title.textContent = (layer.isClippingMask ? '↳ ' : '') + layer.name;

      item.appendChild(visBtn);
      item.appendChild(lockBtn);
      item.appendChild(thumb);
      item.appendChild(title);

      item.addEventListener('click', () => {
        this.layerManager.setActiveLayer(layer.id);
      });

      list.appendChild(item);
    });

    const active = this.layerManager.getActiveLayer();
    if (active) {
      this.dom.layerBlendMode.value = active.blendMode;
      this.dom.layerOpacitySlider.value = Math.round(active.opacity * 100);
      this.dom.layerOpacityVal.textContent = `${Math.round(active.opacity * 100)}%`;
    }
  }

  renderHistoryUI(state) {
    const list = this.dom.historyList;
    list.innerHTML = '';

    state.undoStack.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = `history-item ${idx === state.currentIndex ? 'active' : ''}`;
      el.innerHTML = `<i class="fa-solid fa-check"></i> <span>${item.name}</span>`;
      el.addEventListener('click', () => {
        this.historyManager.jumpTo(idx, (snap) => this.layerManager.restoreSnapshot(snap));
      });
      list.appendChild(el);
    });

    state.redoStack.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'history-item undone';
      el.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> <span>${item.name}</span>`;
      list.appendChild(el);
    });

    list.scrollTop = list.scrollHeight;
  }

  triggerUndo() {
    this.historyManager.undo((snapshot) => {
      this.layerManager.restoreSnapshot(snapshot);
      this.updateStatusMessage('Undo performed');
    });
  }

  triggerRedo() {
    this.historyManager.redo((snapshot) => {
      this.layerManager.restoreSnapshot(snapshot);
      this.updateStatusMessage('Redo performed');
    });
  }

  updateActiveLayerStatus() {
    const active = this.layerManager.getActiveLayer();
    if (active) {
      this.dom.statusActiveLayer.textContent = active.name;
    }
  }

  updateStatusMessage(msg) {
    this.dom.statusMessage.textContent = msg;
  }

  saveProjectJSON() {
    const projectData = {
      version: '4.0.0',
      appName: 'Canvas Paint Pro',
      projectName: this.projectName,
      width: this.canvasWidth,
      height: this.canvasHeight,
      vectorObjects: this.vectorEngine.objects,
      slides: this.slideEngine.slides,
      layers: this.layerManager.layers.map(l => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        locked: l.locked,
        opacity: l.opacity,
        blendMode: l.blendMode,
        isClippingMask: l.isClippingMask,
        data: l.canvas.toDataURL('image/png')
      }))
    };

    const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = this.projectName.endsWith('.json') ? this.projectName : `${this.projectName}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    this.updateStatusMessage('Project saved to JSON');
  }

  handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const project = JSON.parse(event.target.result);
          this.loadProjectFromJSON(project);
        } catch {
          alert('Invalid project file format.');
        }
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const newLayer = this.layerManager.addLayer(file.name.slice(0, 20));
          const cx = (this.canvasWidth - img.width) / 2;
          const cy = (this.canvasHeight - img.height) / 2;
          newLayer.ctx.drawImage(img, cx, cy);
          this.layerManager.notify();
          this.historyManager.pushState(`Import: ${file.name.slice(0, 15)}`, () => this.layerManager.createSnapshot());
          this.updateStatusMessage(`Imported ${file.name}`);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  }

  loadProjectFromJSON(project) {
    this.canvasWidth = project.width;
    this.canvasHeight = project.height;
    this.projectName = project.projectName || 'Project.json';
    this.documentManager.updateActiveDocName(this.projectName);

    this.viewport.setCanvasSize(this.canvasWidth, this.canvasHeight);
    this.dom.statusCanvasSize.textContent = `${this.canvasWidth} x ${this.canvasHeight} px`;

    this.layerManager.stackContainer.innerHTML = '';
    this.layerManager.layers = [];

    if (project.vectorObjects) {
      this.vectorEngine.objects = project.vectorObjects;
      this.vectorEngine.render();
    }

    if (project.slides) {
      this.slideEngine.slides = project.slides;
      this.renderSlidesUI(this.slideEngine.slides, this.slideEngine.activeSlideIndex);
    }

    let loadedCount = 0;
    project.layers.forEach((lData) => {
      const canvas = document.createElement('canvas');
      canvas.id = lData.id;
      canvas.className = 'layer-canvas-item';
      canvas.width = this.canvasWidth;
      canvas.height = this.canvasHeight;
      const ctx = canvas.getContext('2d');

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        loadedCount++;
        if (loadedCount === project.layers.length) {
          this.layerManager.notify();
          this.historyManager.pushState('Open Project', () => this.layerManager.createSnapshot());
          this.viewport.centerInViewport();
          this.updateStatusMessage(`Project "${this.projectName}" loaded`);
        }
      };
      img.src = lData.data;

      const layerObj = {
        id: lData.id,
        name: lData.name,
        canvas: canvas,
        ctx: ctx,
        visible: lData.visible,
        locked: lData.locked,
        opacity: lData.opacity,
        blendMode: lData.blendMode,
        isClippingMask: lData.isClippingMask || false
      };

      this.layerManager.layers.push(layerObj);
      this.layerManager.applyLayerStyles(layerObj);
      this.layerManager.stackContainer.appendChild(canvas);
    });

    this.layerManager.activeLayerId = project.layers[project.layers.length - 1].id;
  }

  showModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
  }

  hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
  }

  setupModals() {
    const presetSelect = document.getElementById('preset-selector');
    const widthInput = document.getElementById('new-canvas-width');
    const heightInput = document.getElementById('new-canvas-height');

    presetSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === '1280x720') { widthInput.value = 1280; heightInput.value = 720; }
      else if (val === '1920x1080') { widthInput.value = 1920; heightInput.value = 1080; }
      else if (val === '800x600') { widthInput.value = 800; heightInput.value = 600; }
      else if (val === '1080x1080') { widthInput.value = 1080; heightInput.value = 1080; }
      else if (val === '1200x630') { widthInput.value = 1200; heightInput.value = 630; }
      else if (val === 'a4') { widthInput.value = 2480; heightInput.value = 3508; }
    });

    document.getElementById('btn-modal-new-close').addEventListener('click', () => this.hideModal('new-canvas-modal'));
    document.getElementById('btn-modal-new-cancel').addEventListener('click', () => this.hideModal('new-canvas-modal'));

    document.getElementById('btn-modal-new-create').addEventListener('click', () => {
      const w = parseInt(widthInput.value);
      const h = parseInt(heightInput.value);
      const bgRadio = document.querySelector('input[name="bg-type"]:checked').value;

      this.canvasWidth = w;
      this.canvasHeight = h;
      this.dom.statusCanvasSize.textContent = `${w} x ${h} px`;

      this.viewport.setCanvasSize(w, h);
      this.toolManager.resizeOverlay(w, h);
      this.vectorEngine.objects = [];
      this.vectorEngine.render();
      this.layerManager.width = w;
      this.layerManager.height = h;
      this.layerManager.init(bgRadio);

      this.historyManager.clear();
      this.historyManager.pushState('New Document', () => this.layerManager.createSnapshot());

      this.documentManager.addDocument(
        `Canvas-${this.documentManager.docCounter + 1}.cpp`,
        w,
        h,
        this.layerManager.createSnapshot(),
        []
      );

      this.hideModal('new-canvas-modal');
      this.viewport.centerInViewport();
      this.updateStatusMessage(`Created ${w} x ${h} canvas`);
    });

    document.getElementById('btn-modal-shortcuts-close').addEventListener('click', () => this.hideModal('shortcuts-modal'));
    document.getElementById('btn-modal-shortcuts-ok').addEventListener('click', () => this.hideModal('shortcuts-modal'));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new CanvasPaintProApp();
});

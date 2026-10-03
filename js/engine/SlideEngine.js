/**
 * Canvas Paint Pro - PowerPoint Presentation Slide & Animation Engine
 * Handles slide deck management, slide thumbnails, 16:9 & 4:3 presets, object animations, and fullscreen presentation player
 */

export class SlideEngine {
  constructor(layerManager, vectorEngine, historyManager, viewport) {
    this.layerManager = layerManager;
    this.vectorEngine = vectorEngine;
    this.historyManager = historyManager;
    this.viewport = viewport;

    this.slides = [];
    this.activeSlideIndex = 0;
    this.slideCounter = 1;
    this.aspectRatio = '16:9'; // '16:9', '4:3', 'custom'

    this.onSlidesChange = null;
    this.init();
  }

  init() {
    this.addSlide('Slide 1', true);
  }

  setSlidePreset(preset) {
    this.aspectRatio = preset;
    let w = 1920, h = 1080;
    if (preset === '4:3') {
      w = 1440;
      h = 1080;
    } else if (preset === '16:9') {
      w = 1920;
      h = 1080;
    }
    this.layerManager.resize(w, h);
    this.viewport.setCanvasSize(w, h);
    this.viewport.centerInViewport();
  }

  addSlide(title = null, isInitial = false) {
    const slideId = `slide-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const slideTitle = title || `Slide ${this.slideCounter++}`;

    const newSlide = {
      id: slideId,
      title: slideTitle,
      layerSnapshot: isInitial ? this.layerManager.createSnapshot() : null,
      vectorObjects: isInitial ? [...this.vectorEngine.objects] : [],
      thumbDataUrl: ''
    };

    if (!isInitial) {
      this.layerManager.init('white');
      this.vectorEngine.objects = [];
      this.vectorEngine.deselect();
      newSlide.layerSnapshot = this.layerManager.createSnapshot();
    }

    this.slides.push(newSlide);
    this.activeSlideIndex = this.slides.length - 1;
    this.updateThumbnail(this.activeSlideIndex);

    if (this.onSlidesChange) this.onSlidesChange(this.slides, this.activeSlideIndex);
    return newSlide;
  }

  duplicateSlide(index) {
    if (index < 0 || index >= this.slides.length) return;
    this.saveCurrentSlideState();

    const src = this.slides[index];
    const newSlide = {
      id: `slide-${Date.now()}`,
      title: `${src.title} (Copy)`,
      layerSnapshot: JSON.parse(JSON.stringify(src.layerSnapshot)),
      vectorObjects: JSON.parse(JSON.stringify(src.vectorObjects)),
      thumbDataUrl: src.thumbDataUrl
    };

    this.slides.splice(index + 1, 0, newSlide);
    this.switchSlide(index + 1);
  }

  deleteSlide(index) {
    if (this.slides.length <= 1) {
      alert('Presentation must contain at least one slide.');
      return;
    }

    this.slides.splice(index, 1);
    const nextIdx = Math.max(0, index - 1);
    this.switchSlide(nextIdx);
  }

  reorderSlide(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.slides.length || toIndex < 0 || toIndex >= this.slides.length) return;
    const [slide] = this.slides.splice(fromIndex, 1);
    this.slides.splice(toIndex, 0, slide);
    this.switchSlide(toIndex);
  }

  saveCurrentSlideState() {
    if (this.slides[this.activeSlideIndex]) {
      const cur = this.slides[this.activeSlideIndex];
      cur.layerSnapshot = this.layerManager.createSnapshot();
      cur.vectorObjects = JSON.parse(JSON.stringify(this.vectorEngine.objects));
      this.updateThumbnail(this.activeSlideIndex);
    }
  }

  switchSlide(index) {
    if (index < 0 || index >= this.slides.length) return;
    this.saveCurrentSlideState();

    this.activeSlideIndex = index;
    const target = this.slides[index];

    if (target.layerSnapshot) {
      this.layerManager.restoreSnapshot(target.layerSnapshot);
    }

    this.vectorEngine.objects = target.vectorObjects ? JSON.parse(JSON.stringify(target.vectorObjects)) : [];
    this.vectorEngine.deselect();
    this.vectorEngine.render();

    if (this.onSlidesChange) this.onSlidesChange(this.slides, this.activeSlideIndex);
  }

  updateThumbnail(index) {
    const slide = this.slides[index];
    if (!slide) return;

    const composite = this.layerManager.getCompositeCanvas();
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 160;
    tempCanvas.height = 90;
    const tCtx = tempCanvas.getContext('2d');

    tCtx.drawImage(composite, 0, 0, 160, 90);

    this.vectorEngine.objects.forEach(obj => {
      const scaleX = 160 / this.layerManager.width;
      const scaleY = 90 / this.layerManager.height;
      tCtx.save();
      tCtx.scale(scaleX, scaleY);
      this.vectorEngine.drawObject(tCtx, obj);
      tCtx.restore();
    });

    slide.thumbDataUrl = tempCanvas.toDataURL('image/jpeg', 0.8);
  }

  // ==========================================
  // OBJECT ANIMATION ASSIGNMENT (Fade, Fly-in, Zoom, Bounce)
  // ==========================================

  setObjectAnimation(animationType = 'fade') {
    const sel = this.vectorEngine.getSelectedObject();
    if (!sel) return;
    sel.animation = animationType; // 'fade', 'fly-in', 'zoom', 'bounce'
    this.saveCurrentSlideState();
  }

  // ==========================================
  // FULLSCREEN PRESENTATION MODE
  // ==========================================

  startPresentation() {
    this.saveCurrentSlideState();

    const presenter = document.createElement('div');
    presenter.id = 'slide-presenter-overlay';
    presenter.className = 'slide-presenter-overlay';

    let currentPresentIdx = this.activeSlideIndex;

    const renderSlideToPresenter = (idx) => {
      presenter.innerHTML = '';
      const slide = this.slides[idx];

      const img = document.createElement('img');
      img.className = 'presenter-slide-img';

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
      }

      if (slide.vectorObjects) {
        slide.vectorObjects.forEach(obj => this.vectorEngine.drawObject(ctx, obj));
      }

      img.src = comp.toDataURL('image/png');

      // Check if slide has animations
      img.style.animation = 'slideFadeIn 0.35s ease';
      presenter.appendChild(img);

      const badge = document.createElement('div');
      badge.className = 'presenter-hud';
      badge.innerHTML = `<span>Slide ${idx + 1} of ${this.slides.length}</span> — <em>${slide.title}</em> (Arrow Keys to navigate, Esc to exit)`;
      presenter.appendChild(badge);
    };

    const keyHandler = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        if (currentPresentIdx < this.slides.length - 1) {
          currentPresentIdx++;
          renderSlideToPresenter(currentPresentIdx);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        if (currentPresentIdx > 0) {
          currentPresentIdx--;
          renderSlideToPresenter(currentPresentIdx);
        }
      } else if (e.key === 'Escape') {
        exitPresentation();
      }
    };

    const exitPresentation = () => {
      window.removeEventListener('keydown', keyHandler);
      presenter.remove();
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      this.switchSlide(currentPresentIdx);
    };

    window.addEventListener('keydown', keyHandler);
    presenter.addEventListener('click', (e) => {
      if (e.clientX > window.innerWidth / 2) {
        if (currentPresentIdx < this.slides.length - 1) {
          currentPresentIdx++;
          renderSlideToPresenter(currentPresentIdx);
        } else {
          exitPresentation();
        }
      } else {
        if (currentPresentIdx > 0) {
          currentPresentIdx--;
          renderSlideToPresenter(currentPresentIdx);
        }
      }
    });

    document.body.appendChild(presenter);
    renderSlideToPresenter(currentPresentIdx);

    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }
}

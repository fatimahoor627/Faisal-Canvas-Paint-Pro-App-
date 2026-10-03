/**
 * Canvas Paint Pro - Multi-Tab Document Workspace Engine
 * Manages multiple simultaneous open project tabs, state isolation, and fast tab switching
 */

export class DocumentManager {
  constructor(tabContainer, onSwitchDoc, onNewDoc) {
    this.container = tabContainer;
    this.onSwitchDoc = onSwitchDoc;
    this.onNewDoc = onNewDoc;

    this.docs = [];
    this.activeDocId = null;
    this.docCounter = 1;
  }

  initDefaultDoc(initialSnapshot, initialObjects, initialSlides, width = 1920, height = 1080) {
    const id = `doc-${Date.now()}`;
    const doc = {
      id,
      name: 'Untitled-1.cpp',
      width,
      height,
      snapshot: initialSnapshot,
      objects: initialObjects || [],
      slides: initialSlides || [],
      zoom: 1,
      panX: 0,
      panY: 0
    };

    this.docs.push(doc);
    this.activeDocId = id;
    this.renderTabs();
    return doc;
  }

  addDocument(name, width, height, initialSnapshot, initialObjects = []) {
    const id = `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const docName = name || `Untitled-${++this.docCounter}.cpp`;

    const doc = {
      id,
      name: docName,
      width,
      height,
      snapshot: initialSnapshot,
      objects: initialObjects,
      slides: [],
      zoom: 1,
      panX: 0,
      panY: 0
    };

    this.docs.push(doc);
    this.activeDocId = id;
    this.renderTabs();
    return doc;
  }

  getActiveDocument() {
    return this.docs.find(d => d.id === this.activeDocId) || null;
  }

  switchTab(docId) {
    if (this.activeDocId === docId) return;
    this.activeDocId = docId;
    this.renderTabs();
    const doc = this.getActiveDocument();
    if (doc && this.onSwitchDoc) {
      this.onSwitchDoc(doc);
    }
  }

  closeTab(docId, e) {
    if (e) e.stopPropagation();
    if (this.docs.length <= 1) {
      alert('Cannot close the only open document.');
      return;
    }

    const idx = this.docs.findIndex(d => d.id === docId);
    if (idx === -1) return;

    this.docs.splice(idx, 1);
    if (this.activeDocId === docId) {
      const nextIdx = Math.max(0, idx - 1);
      this.activeDocId = this.docs[nextIdx].id;
      if (this.onSwitchDoc) this.onSwitchDoc(this.docs[nextIdx]);
    }
    this.renderTabs();
  }

  updateActiveDocName(newName) {
    const doc = this.getActiveDocument();
    if (doc) {
      doc.name = newName;
      this.renderTabs();
    }
  }

  renderTabs() {
    if (!this.container) return;
    this.container.innerHTML = '';

    this.docs.forEach((doc) => {
      const tab = document.createElement('div');
      tab.className = `canvas-tab-item ${doc.id === this.activeDocId ? 'active' : ''}`;
      tab.innerHTML = `
        <i class="fa-solid fa-file-code"></i>
        <span class="tab-title">${doc.name}</span>
        <button class="tab-close-btn" title="Close Document"><i class="fa-solid fa-xmark"></i></button>
      `;

      tab.addEventListener('click', () => this.switchTab(doc.id));
      tab.querySelector('.tab-close-btn').addEventListener('click', (e) => this.closeTab(doc.id, e));

      this.container.appendChild(tab);
    });

    // Add Tab Button (+)
    const addBtn = document.createElement('button');
    addBtn.className = 'tab-add-btn';
    addBtn.title = 'New Canvas Document';
    addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
    addBtn.addEventListener('click', () => {
      if (this.onNewDoc) this.onNewDoc();
    });
    this.container.appendChild(addBtn);
  }
}

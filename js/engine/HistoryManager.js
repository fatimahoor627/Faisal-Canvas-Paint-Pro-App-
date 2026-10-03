/**
 * Canvas Paint Pro - History & Undo/Redo Engine
 * Captures snapshots and actions with interactive history stack panel
 */

export class HistoryManager {
  constructor(maxStates = 30) {
    this.maxStates = maxStates;
    this.undoStack = [];
    this.redoStack = [];
    this.onStateChange = null;
  }

  pushState(actionName, snapshotFn) {
    const stateData = snapshotFn();
    this.undoStack.push({
      id: Date.now() + Math.random(),
      name: actionName,
      data: stateData
    });

    if (this.undoStack.length > this.maxStates) {
      this.undoStack.shift();
    }

    // Clear redo on new action
    this.redoStack = [];

    this.notify();
  }

  canUndo() {
    return this.undoStack.length > 1; // Keep at least the initial state
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  undo(restoreFn) {
    if (!this.canUndo()) return false;

    const currentState = this.undoStack.pop();
    this.redoStack.push(currentState);

    const targetState = this.undoStack[this.undoStack.length - 1];
    restoreFn(targetState.data);

    this.notify();
    return true;
  }

  redo(restoreFn) {
    if (!this.canRedo()) return false;

    const nextState = this.redoStack.pop();
    this.undoStack.push(nextState);

    restoreFn(nextState.data);

    this.notify();
    return true;
  }

  jumpTo(index, restoreFn) {
    if (index < 0 || index >= this.undoStack.length) return;

    // Moving backward in undo stack
    while (this.undoStack.length - 1 > index) {
      this.redoStack.push(this.undoStack.pop());
    }

    const targetState = this.undoStack[this.undoStack.length - 1];
    restoreFn(targetState.data);
    this.notify();
  }

  clear() {
    if (this.undoStack.length > 0) {
      const initial = this.undoStack[0];
      this.undoStack = [initial];
      this.redoStack = [];
      this.notify();
    }
  }

  notify() {
    if (this.onStateChange) {
      this.onStateChange({
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
        undoStack: this.undoStack,
        redoStack: this.redoStack,
        currentIndex: this.undoStack.length - 1
      });
    }
  }
}

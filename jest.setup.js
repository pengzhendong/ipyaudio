if (typeof globalThis.DragEvent === 'undefined') {
  globalThis.DragEvent = class DragEvent extends MouseEvent {};
}

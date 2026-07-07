import type { Canvas } from 'fabric'

export interface MinimalBaseStore {
  canvas: Canvas | null
  generateConfig: (options?: { validateBindings?: boolean }) => unknown
}

export interface HistoryController {
  saveInitial: () => void
  saveState: (reason?: string, options?: { coalesceIfSameFabric?: boolean; captureConfig?: boolean }) => void
  attachCanvas: (canvas: Canvas) => void
  registerCanvasEvents: () => void
  undo: () => void | Promise<void>
  redo: () => void | Promise<void>
  canUndo: () => boolean
  canRedo: () => boolean
  clear: () => void
  dispose: () => void
}

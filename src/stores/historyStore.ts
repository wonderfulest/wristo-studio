import { defineStore } from 'pinia'
import { ref, type Ref } from 'vue'
import type { Canvas } from 'fabric'
import type { MinimalBaseStore } from '@/types/history'

export type Snapshot = {
  fabricJSON: string
  configJSON?: string
}

const MAX_HISTORY = 100
const RESTORE_SETTLE_MS = 60

export const useHistoryStore = defineStore('history', () => {
  const undoStack: Ref<Snapshot[]> = ref([])
  const redoStack: Ref<Snapshot[]> = ref([])
  const isRestoring: Ref<boolean> = ref(false)
  let canvas: Canvas | null = null
  let baseStore: MinimalBaseStore | null = null
  let handlers: {
    added?: () => void
    modified?: () => void
    removed?: () => void
  } = {}
  let eventsAttached = false

  const currentSnapshotEqual = (snap: Snapshot): boolean => {
    if (!canvas) return false
    try {
      const nowFabric = JSON.stringify(canvas.toJSON())
      return nowFabric === snap.fabricJSON
    } catch {
      return false
    }
  }

  const takeSnapshot = (): Snapshot | null => {
    if (!canvas) return null
    try {
      const fabricJSON = JSON.stringify(canvas.toJSON())
      return { fabricJSON }
    } catch {
      return null
    }
  }

  const saveState = (_reason?: string) => {
    if (!canvas) return
    if (isRestoring.value) {
      console.debug('[History] saveState skipped (restoring)')
      return
    }
    const snap = takeSnapshot()
    if (!snap) return
    const last = undoStack.value[undoStack.value.length - 1]
    if (last?.configJSON && !snap.configJSON) snap.configJSON = last.configJSON
    if (last && currentSnapshotEqual(last)) return

    undoStack.value.push(snap)
    if (undoStack.value.length > MAX_HISTORY) undoStack.value.shift()
    if (redoStack.value.length) {
      console.debug('[History] clear redoStack due to new operation, size=', redoStack.value.length)
    }
    redoStack.value = []
  }

  const saveInitial = () => {
    if (!canvas || !baseStore) return
    let configJSON: string | undefined
    try {
      const cfg = baseStore.generateConfig()
      if (cfg != null) configJSON = JSON.stringify(cfg)
    } catch {
      // ignore config capture errors
    }
    const fabricJSON = JSON.stringify(canvas.toJSON())
    const snap: Snapshot = { fabricJSON, configJSON }
    undoStack.value = [snap]
    redoStack.value = []
  }

  const attachCanvas = (c: Canvas, base: MinimalBaseStore) => {
    canvas = c
    baseStore = base
  }

  const registerCanvasEvents = () => {
    if (!canvas || eventsAttached) return
    handlers.added = () => saveState('added')
    handlers.modified = () => saveState('modified')
    handlers.removed = () => saveState('removed')
    canvas.on('object:added', handlers.added)
    canvas.on('object:modified', handlers.modified)
    canvas.on('object:removed', handlers.removed)
    eventsAttached = true
  }

  const detachCanvasEvents = () => {
    if (!canvas || !eventsAttached) return
    if (handlers.added) canvas.off('object:added', handlers.added)
    if (handlers.modified) canvas.off('object:modified', handlers.modified)
    if (handlers.removed) canvas.off('object:removed', handlers.removed)
    eventsAttached = false
  }

  const undo = () => {
    if (!canvas) return
    if (undoStack.value.length <= 1) return
    const current = undoStack.value.pop() as Snapshot
    redoStack.value.push(current)
    const prev = undoStack.value[undoStack.value.length - 1]
    console.debug('[History] undo -> load prev snapshot', {
      undo: undoStack.value.length,
      redo: redoStack.value.length,
    })
    isRestoring.value = true
    detachCanvasEvents()
    canvas.loadFromJSON(prev.fabricJSON, () => {
      canvas?.requestRenderAll()
      window.setTimeout(() => {
        registerCanvasEvents()
        window.setTimeout(() => {
          isRestoring.value = false
          console.debug('[History] undo completed')
        }, 0)
      }, RESTORE_SETTLE_MS)
    })
  }

  const redo = () => {
    if (!canvas) return
    if (redoStack.value.length === 0) return
    const next = redoStack.value.pop() as Snapshot
    undoStack.value.push(next)
    console.debug('[History] redo -> load next snapshot', {
      undo: undoStack.value.length,
      redo: redoStack.value.length,
    })
    isRestoring.value = true
    detachCanvasEvents()
    canvas.loadFromJSON(next.fabricJSON, () => {
      canvas?.requestRenderAll()
      window.setTimeout(() => {
        registerCanvasEvents()
        window.setTimeout(() => {
          isRestoring.value = false
          console.debug('[History] redo completed')
        }, 0)
      }, RESTORE_SETTLE_MS)
    })
  }

  const canUndo = () => undoStack.value.length > 1
  const canRedo = () => redoStack.value.length > 0
  const clear = () => {
    undoStack.value = []
    redoStack.value = []
  }

  const dispose = () => {
    detachCanvasEvents()
    clear()
    canvas = null
    baseStore = null
  }

  return {
    saveInitial,
    saveState,
    attachCanvas,
    registerCanvasEvents,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
    dispose,
  }
})

import { ref, type Ref } from 'vue'
import type { Canvas } from 'fabric'
import type { HistoryController, MinimalBaseStore } from '@/types/history'

type Snapshot = {
  fabricJSON: string
  configJSON?: string
}

const MAX_HISTORY = 100
const RESTORE_SETTLE_MS = 60

export function useHistory(base: MinimalBaseStore): HistoryController {
  const undoStack: Ref<Snapshot[]> = ref([])
  const redoStack: Ref<Snapshot[]> = ref([])
  const isRestoring: Ref<boolean> = ref(false)
  let canvas: Canvas | null = null
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
      // 仅比较画布，避免频繁调用 generateConfig 导致报错/日志
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
      // 跳过还原阶段的保存
      console.debug('[History] saveState skipped (restoring)')
      return
    }
    const snap = takeSnapshot()
    if (!snap) return
    // 继承上一个快照中的 configJSON，避免频繁调用 generateConfig
    const last = undoStack.value[undoStack.value.length - 1]
    if (last?.configJSON && !snap.configJSON) snap.configJSON = last.configJSON
    // 去重：若与上一个相同则不入栈
    if (last && currentSnapshotEqual(last)) return

    undoStack.value.push(snap)
    if (undoStack.value.length > MAX_HISTORY) undoStack.value.shift()
    if (redoStack.value.length) {
      console.debug('[History] clear redoStack due to new operation, size=', redoStack.value.length)
    }
    redoStack.value = []
  }

  const saveInitial = () => {
    if (!canvas) return
    // 初始快照尝试捕获 config
    let configJSON: string | undefined
    try {
      const cfg = base.generateConfig()
      if (cfg != null) configJSON = JSON.stringify(cfg)
    } catch {
      // 忽略配置捕获错误
    }
    const fabricJSON = JSON.stringify(canvas.toJSON())
    const snap: Snapshot = { fabricJSON, configJSON }
    undoStack.value = [snap]
    redoStack.value = []
  }

  const attachCanvas = (c: Canvas) => {
    canvas = c
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
    // 防止还原阶段触发 saveState
    detachCanvasEvents()
    // 还原画布
    canvas?.loadFromJSON(prev.fabricJSON, () => {
      canvas?.requestRenderAll()
      // 使用小延迟等待 Fabric 内部事件完全结算后再恢复监听
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
    // 防止还原阶段触发 saveState
    detachCanvasEvents()
    // 还原画布
    canvas?.loadFromJSON(next.fabricJSON, () => {
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
}

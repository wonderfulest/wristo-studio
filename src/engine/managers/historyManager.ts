import { useHistoryStore } from '@/stores/historyStore'

export interface HistoryManagerHandle {
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  clear: () => void
  dispose: () => void
}

/**
 * 统一封装 historyStore 的 undo/redo 能力，提供一个轻量的 Manager 接口。
 *
 * 典型用法：
 *   const historyStore = useHistoryStore()
 *   const historyManager = createHistoryManager(historyStore)
 */
export function createHistoryManager(
  store: ReturnType<typeof useHistoryStore> = useHistoryStore(),
): HistoryManagerHandle {
  const undo = () => {
    store.undo()
  }

  const redo = () => {
    store.redo()
  }

  const canUndo = () => store.canUndo()
  const canRedo = () => store.canRedo()

  const clear = () => {
    store.clear()
  }

  const dispose = () => {
    store.dispose()
  }

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
    dispose,
  }
}

import type { ElementType, FabricElement } from '@/types/element'
import { getElementHandler, encodeElementByRegistry } from '@/engine/registry/elementRegistry'
import type { AnyElementConfig } from '@/types/elements'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'

/**
 * ElementManager
 * 统一入口：基于 ElementRegistry 分发到各自元素 handler
 */

export function addElement(type: ElementType, config: any) {
  const handler = getElementHandler(type)
  if (!handler || !handler.add) {
    throw new Error(`[ElementManager] addElement: unknown type ${type}`)
  }
  return handler.add(type, config)
}

export function updateElement(element: FabricElement, patch: any) {
  if (!element) return
  const type = (element as any).eleType as ElementType | undefined
  if (!type) {
    console.warn('[ElementManager] updateElement: element has no eleType', { element, patch })
    return
  }
  const handler = getElementHandler(type)
  if (!handler || !handler.update) {
    console.warn('[ElementManager] updateElement: no update handler for type', { type, element, patch })
    return
  }
  handler.update(element, patch)
}

export function removeElement(element: FabricElement) {
  const baseStore = useBaseStore()
  const layerStore = useLayerStore()
  const canvas = baseStore.canvas
  if (!canvas || !element) return

  try {
    canvas.remove(element as any)
  } catch (e) {
    console.warn('[ElementManager] removeElement: remove from canvas failed', { id: (element as any).id, e })
  }

  try {
    const id = (element as any).id
    if (id != null) {
      layerStore.removeLayer(String(id))
    }
  } catch (e) {
    console.warn('[ElementManager] removeElement: remove layer failed', { id: (element as any).id, e })
  }
}

// =========================
// Selection-level operations
// =========================

// 简单剪贴板：存储最近一次复制的元素配置
let selectionClipboard: AnyElementConfig[] = []

/**
 * 轻推当前选中元素（方向键/Shift+方向键）。
 */
export function nudgeSelection(
  direction: 'left' | 'right' | 'up' | 'down',
  step: number,
): void {
  const baseStore = useBaseStore()
  const canvas = baseStore.canvas
  if (!canvas) return

  const dx = direction === 'left' ? -step : direction === 'right' ? step : 0
  const dy = direction === 'up' ? -step : direction === 'down' ? step : 0
  if (!dx && !dy) return

  const actives = canvas.getActiveObjects() as any[]
  if (!actives || actives.length === 0) return

  actives.forEach((obj) => {
    if (!obj) return
    const left = Number(obj.left ?? 0)
    const top = Number(obj.top ?? 0)
    obj.set({ left: left + dx, top: top + dy })
    obj.setCoords?.()
  })

  canvas.requestRenderAll?.()
}

/**
 * 调整当前选中元素的字体大小（用于 Shift + +/-）。
 */
export function changeSelectionFontSize(delta: number): void {
  const baseStore = useBaseStore()
  const canvas = baseStore.canvas
  if (!canvas) return

  const actives = canvas.getActiveObjects() as any[]
  if (!actives || actives.length === 0) return

  actives.forEach((obj) => {
    if (!obj) return
    const current = Number((obj as any).fontSize ?? 0)
    if (!Number.isFinite(current)) return
    const next = Math.max(1, current + delta)
    ;(obj as any).set?.('fontSize', next)
    obj.setCoords?.()
  })

  canvas.requestRenderAll?.()
}

/**
 * 复制当前选中元素。
 */
export function copySelection(): void {
  const baseStore = useBaseStore()
  const canvas = baseStore.canvas
  if (!canvas) return

  const actives = canvas.getActiveObjects() as FabricElement[]
  if (!actives || actives.length === 0) {
    selectionClipboard = []
    return
  }

  const encoded: AnyElementConfig[] = []
  actives.forEach((el) => {
    const cfg = encodeElementByRegistry(el)
    if (cfg) {
      encoded.push(cfg as AnyElementConfig)
    }
  })

  selectionClipboard = encoded
}

/**
 * 粘贴先前复制的元素。
 */
export function pasteSelection(): void {
  if (!selectionClipboard.length) return

  selectionClipboard.forEach((cfg) => {
    try {
      addElement(cfg.eleType as ElementType, cfg)
    } catch (e) {
      console.warn('[ElementManager] pasteSelection: failed to add element from clipboard', {
        cfg,
        e,
      })
    }
  })
}


/**
 * ElementManager
 * 统一入口：基于 ElementRegistry 分发到各自元素 handler
 * - 创建 / 销毁 Fabric 对象
 * - 根据业务配置渲染 / 更新 group
 * - 内部维护 `id -> FabricObject` 的 Map 或 Registry
 */
import type { ElementType, FabricElement } from '@/types/element'
import { getElementHandler, encodeElementByRegistry } from '@/engine/registry/elementRegistry'
import type { AnyElementConfig } from '@/types/elements'
import { useLayerStore } from '@/stores/layerStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { nanoid } from 'nanoid'

// 运行时缓存：id -> FabricElement
// 作为轻量级 Registry，供各元素 handler / 设置面板按 id O(1) 查找 Group
const elementMap = new Map<string, FabricElement>()

export function registerElementInstance(element: FabricElement | null | undefined) {
  if (!element) return
  const id = (element as any).id
  if (id == null) return
  elementMap.set(String(id), element)
}

export function unregisterElementInstance(target: string | FabricElement | null | undefined) {
  if (!target) return
  const id = typeof target === 'string' ? target : (target as any).id
  if (id == null) return
  elementMap.delete(String(id))
}

export function getElementById(id: string | number | null | undefined): FabricElement | undefined {
  if (id == null) return undefined
  return elementMap.get(String(id))
}

export function addElement(type: ElementType, config: AnyElementConfig) {
  const handler = getElementHandler(type)
  if (!handler || !handler.add) {
    throw new Error(`[ElementManager] addElement: unknown type ${type}`)
  }
  // 标准化调用：由调用方保证 config.eleType 与 type 一致
  const element = handler.add(config) as FabricElement | null | undefined
  registerElementInstance(element as any)
  return element
}

export function updateElement(element: FabricElement, patch: any) {
  if (!element) return

  const id = (element as any).id
  let resolved: FabricElement = element
  if (id != null) {
    const fromMap = getElementById(id)
    if (fromMap) {
      resolved = fromMap
    } else {
      const canvasStore = useCanvasStore()
      const canvas = canvasStore.canvas
      const found = (canvas?.getObjects?.() || []).find(
        (o: any) => o?.id != null && String(o.id) === String(id),
      ) as FabricElement | undefined
      if (found) {
        resolved = found
        registerElementInstance(found)
      }
    }
  }

  const type = (resolved as any).eleType as ElementType | undefined
  if (!type) {
    console.warn('[ElementManager] updateElement: element has no eleType', { element: resolved, patch })
    return
  }
  const handler = getElementHandler(type)
  if (!handler || !handler.update) {
    console.warn('[ElementManager] updateElement: no update handler for type', { type, element: resolved, patch })
    return
  }
  handler.update(resolved, patch)
}

export function updateElementById(id: string | number | null | undefined, patch: any) {
  if (id == null) return
  const resolved = getElementById(id)
  if (resolved) {
    updateElement(resolved, patch)
    return
  }
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  const found = (canvas?.getObjects?.() || []).find(
    (o: any) => o?.id != null && String(o.id) === String(id),
  ) as FabricElement | undefined
  if (!found) return
  registerElementInstance(found)
  updateElement(found, patch)
}

export function removeElement(element: FabricElement) {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const canvas = canvasStore.canvas
  if (!canvas || !element) return

  const id = (element as any).id
  console.log('[ElementManager] removeElement: start', {
    id,
    eleType: (element as any)?.eleType,
    type: (element as any)?.type,
  })

  // 为了兼容从 LayerPanel 传入的 Vue Proxy（不是画布上的真实 FabricObject 引用），
  // 这里优先通过 canvas.getObjects() 按 id 找一次真正挂在画布上的对象。
  const allObjects = (canvas.getObjects?.() || []) as any[]
  const resolvedTarget =
    (id != null
      ? allObjects.find((o) => (o as any)?.id != null && String((o as any).id) === String(id))
      : undefined) || (element as any)

  console.log('[ElementManager] removeElement: resolved target on canvas', {
    sameRef: resolvedTarget === element,
    targetId: (resolvedTarget as any)?.id,
    targetType: (resolvedTarget as any)?.type,
    targetEleType: (resolvedTarget as any)?.eleType,
  })

  const beforeObjects = canvas.getObjects?.() || []
  console.log('[ElementManager] removeElement: canvas objects before remove', {
    count: beforeObjects.length,
    ids: (beforeObjects as any[]).map((o) => (o as any).id),
  })

  try {
    canvas.remove(resolvedTarget as any)
  } catch (e) {
    console.warn('[ElementManager] removeElement: remove from canvas failed', { id: (element as any).id, e })
  }

  // 从运行时 Registry 中移除
  try {
    unregisterElementInstance(resolvedTarget as any)
  } catch (e) {
    console.warn('[ElementManager] removeElement: unregister element instance failed', { id: (element as any).id, e })
  }

  try {
    if (id != null) {
      layerStore.removeLayer(String(id))
    }
  } catch (e) {
    console.warn('[ElementManager] removeElement: remove layer failed', { id: (element as any).id, e })
  }

  const afterObjects = canvas.getObjects?.() || []
  console.log('[ElementManager] removeElement: canvas objects after remove', {
    count: afterObjects.length,
    ids: (afterObjects as any[]).map((o) => (o as any).id),
  })
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
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
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
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
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
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas) return

  const actives = canvas.getActiveObjects() as FabricElement[]
  if (!actives || actives.length === 0) {
    selectionClipboard = []
    return
  }

  console.log('[ElementManager] copySelection: active objects', {
    count: actives.length,
    ids: actives.map((el) => (el as any)?.id),
    eleTypes: actives.map((el) => (el as any)?.eleType),
    rawPositions: actives.map((el) => ({
      id: (el as any)?.id,
      eleType: (el as any)?.eleType,
      left: (el as any)?.left,
      top: (el as any)?.top,
      originX: (el as any)?.originX,
      originY: (el as any)?.originY,
      type: (el as any)?.type,
    })),
  })

  const encoded: AnyElementConfig[] = []
  actives.forEach((el) => {
    const cfg = encodeElementByRegistry(el)
    if (cfg) {
      const resolvedEleType = (cfg as any).eleType ?? (cfg as any).type ?? (el as any).eleType
      const next: AnyElementConfig = {
        ...(cfg as AnyElementConfig),
        eleType: resolvedEleType,
      }
      console.log('[ElementManager] copySelection: encoded element', {
        id: (el as any)?.id,
        eleType: (el as any)?.eleType,
        cfg,
        next,
      })
      encoded.push(next)
    }
  })

  selectionClipboard = encoded
  console.log('[ElementManager] copySelection: clipboard set', {
    clipboard: selectionClipboard,
  })
}

/**
 * 粘贴先前复制的元素。
 */
export function pasteSelection(): void {
  if (!selectionClipboard.length) return

  const offset = 20
  console.log('[ElementManager] pasteSelection: start', {
    clipboard: selectionClipboard,
    offset,
  })
  selectionClipboard.forEach((cfg) => {
    try {
      const eleType = (cfg as any).eleType ?? (cfg as any).type
      if (!eleType) {
        console.warn('[ElementManager] pasteSelection: missing eleType/type in clipboard config', {
          cfg,
        })
        return
      }

      const newId = nanoid()

      const baseLeft = cfg.left != null ? Number(cfg.left) : undefined
      const baseTop = cfg.top != null ? Number(cfg.top) : undefined
      const nextLeft = Number.isFinite(baseLeft as number) ? (baseLeft as number) + offset : cfg.left
      const nextTop = Number.isFinite(baseTop as number) ? (baseTop as number) + offset : cfg.top

      const nextCfg: AnyElementConfig = {
        ...(cfg as AnyElementConfig),
        id: newId,
        eleType,
        // 多选粘贴时保持相对位置不变：所有元素使用同一份偏移即可
        left: nextLeft as any,
        top: nextTop as any,
      }
      console.log('[ElementManager] pasteSelection: addElement with config', {
        eleType,
        cfg,
        nextCfg,
      })
      addElement(eleType as ElementType, nextCfg)
    } catch (e) {
      console.warn('[ElementManager] pasteSelection: failed to add element from clipboard', {
        cfg,
        e,
      })
    }
  })
}


import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { getElementById } from '@/engine/managers/elementManager'
import type { LayerElement, MinimalFabricLike } from '@/types/layer'
import { isDefaultBackgroundElement } from '@/elements/decoration/background/background.constants'
import { getDisplayState, normalizeDisplayStates } from '@/utils/displayStates'
import { useElementDataStore } from '@/stores/elementDataStore'

function isFixedLayer(obj: any): boolean {
  const t = String(obj?.eleType ?? '')
  return t === 'global' || t === 'background'
}

function getFixedLayerPriority(obj: any): number {
  const t = String(obj?.eleType ?? '')
  if (t === 'global') return 0
  if (t === 'background' || isDefaultBackgroundElement(obj)) return 1
  return 2
}

function normalizeFixedLayers(canvas: any): number {
  const objects = (canvas.getObjects?.() || []) as any[]
  const fixedObjects = objects
    .filter((obj) => isFixedLayer(obj))
    .sort((a, b) => getFixedLayerPriority(a) - getFixedLayerPriority(b))

  fixedObjects.forEach((obj, index) => {
    canvas.moveObjectTo?.(obj as any, index)
  })

  return fixedObjects.length
}

function resolveCanvasObjectById(id: string): any {
  const fromRegistry = getElementById(id)
  if (fromRegistry) return fromRegistry as any

  const canvas = useCanvasStore().canvas
  if (!canvas) return null

  const objects = (canvas.getObjects?.() || []) as any[]
  return objects.find((o) => o?.id != null && String(o.id) === String(id)) ?? null
}

export function syncLayersFromCanvas(): void {
  const canvas = useCanvasStore().canvas
  const layerStore = useLayerStore()
  if (!canvas) {
    layerStore.setLayers([])
    return
  }

  const objects = (canvas.getObjects?.() || []) as any[]
  const backgroundObj = objects.find((o) => o?.eleType === 'background')
  const userObjects = objects.filter((o) => o?.id != null && o?.eleType && !isFixedLayer(o))
  const elementDataStore = useElementDataStore()

  const nextLayers: LayerElement[] = userObjects.map((obj) => {
    const id = String(obj.id)
    const displayStates = normalizeDisplayStates(obj.displayStates ?? (elementDataStore.getElementConfig(id) as any)?.displayStates)
    obj.displayStates = displayStates
    return {
      id,
      visible: getDisplayState(displayStates, layerStore.previewMode),
      displayStates,
      locked: obj.locked ?? false,
      selectable: obj.selectable ?? true,
      eleType: String(obj.eleType ?? ''),
      element: obj as MinimalFabricLike,
    }
  })

  if (backgroundObj) {
    const bgId = String(backgroundObj.id ?? 'background')
    const locked = Boolean(backgroundObj.locked ?? isDefaultBackgroundElement(backgroundObj))
    const selectable = Boolean(backgroundObj.selectable ?? !locked)
    const displayStates = normalizeDisplayStates(backgroundObj.displayStates ?? (elementDataStore.getElementConfig(bgId) as any)?.displayStates)
    backgroundObj.displayStates = displayStates
    nextLayers.unshift({
      id: bgId,
      visible: getDisplayState(displayStates, layerStore.previewMode),
      displayStates,
      locked,
      selectable,
      eleType: String(backgroundObj.eleType ?? 'background'),
      element: backgroundObj as MinimalFabricLike,
    })
  }

  layerStore.setLayers(nextLayers)
}

export function moveLayerToIndex(id: string, newIndex: number): void {
  const canvas = useCanvasStore().canvas
  if (!canvas) return

  const obj = resolveCanvasObjectById(String(id))
  if (!obj) return
  if (isFixedLayer(obj)) return

  const fixedCount = normalizeFixedLayers(canvas)
  const movableCount = Math.max(0, (canvas.getObjects?.() || []).length - fixedCount)
  const targetIndex = fixedCount + Math.min(Math.max(0, newIndex), Math.max(0, movableCount - 1))

  canvas.moveObjectTo?.(obj as any, targetIndex)
  canvas.requestRenderAll?.()
  syncLayersFromCanvas()
}

export function applyOrder(idsInOrder: string[]): void {
  const canvas = useCanvasStore().canvas
  if (!canvas) return

  const fixedCount = normalizeFixedLayers(canvas)
  const seenMovableIds = new Set<string>()

  const movableIds = idsInOrder
    .map(String)
    .filter((id) => {
      if (seenMovableIds.has(id)) return false
      const obj = resolveCanvasObjectById(id)
      if (!obj) return false
      if (isFixedLayer(obj)) return false
      seenMovableIds.add(id)
      return true
    })
  const orderedSet = new Set(movableIds)
  const remainingMovableIds = ((canvas.getObjects?.() || []) as any[])
    .filter((obj) => obj?.id != null && obj?.eleType && !isFixedLayer(obj))
    .map((obj) => String(obj.id))
    .filter((id) => !orderedSet.has(id))

  ;[...movableIds, ...remainingMovableIds].forEach((id, idx) => {
    const obj = resolveCanvasObjectById(id)
    if (!obj) return
    canvas.moveObjectTo?.(obj as any, fixedCount + idx)
  })

  canvas.requestRenderAll?.()
  syncLayersFromCanvas()
}

export function bringToFront(id: string): boolean {
  const canvas = useCanvasStore().canvas
  if (!canvas) return false

  const obj = resolveCanvasObjectById(String(id))
  if (!obj) return false
  if (isFixedLayer(obj)) return false

  normalizeFixedLayers(canvas)
  const objects = (canvas.getObjects?.() || []) as any[]
  if (objects.indexOf(obj) === objects.length - 1) return false
  canvas.bringObjectToFront?.(obj as any)
  canvas.requestRenderAll?.()
  syncLayersFromCanvas()
  return true
}

export function sendToBack(id: string): boolean {
  const canvas = useCanvasStore().canvas
  if (!canvas) return false

  const obj = resolveCanvasObjectById(String(id))
  if (!obj) return false
  if (isFixedLayer(obj)) return false

  const fixedCount = normalizeFixedLayers(canvas)
  const objects = (canvas.getObjects?.() || []) as any[]
  if (objects.indexOf(obj) === fixedCount) return false
  canvas.moveObjectTo?.(obj as any, fixedCount)

  canvas.requestRenderAll?.()
  syncLayersFromCanvas()
  return true
}

export function bringForward(id: string): boolean {
  const canvas = useCanvasStore().canvas
  if (!canvas) return false

  const obj = resolveCanvasObjectById(String(id))
  if (!obj) return false
  if (isFixedLayer(obj)) return false

  normalizeFixedLayers(canvas)
  const objects = (canvas.getObjects?.() || []) as any[]
  const currentIndex = objects.indexOf(obj)
  if (currentIndex < 0 || currentIndex >= objects.length - 1) return false
  canvas.moveObjectTo?.(obj as any, currentIndex + 1)
  canvas.requestRenderAll?.()
  syncLayersFromCanvas()
  return true
}

export function sendBackward(id: string): boolean {
  const canvas = useCanvasStore().canvas
  if (!canvas) return false

  const obj = resolveCanvasObjectById(String(id))
  if (!obj) return false
  if (isFixedLayer(obj)) return false

  const fixedCount = normalizeFixedLayers(canvas)
  const objects = (canvas.getObjects?.() || []) as any[]
  const currentIndex = objects.indexOf(obj)
  if (currentIndex <= fixedCount) return false
  canvas.moveObjectTo?.(obj as any, currentIndex - 1)
  canvas.requestRenderAll?.()
  syncLayersFromCanvas()
  return true
}

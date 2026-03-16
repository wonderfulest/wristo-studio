import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { getElementById } from '@/engine/managers/elementManager'
import type { LayerElement, MinimalFabricLike } from '@/types/layer'

function isFixedLayer(obj: any): boolean {
  const t = String(obj?.eleType ?? '')
  return t === 'global' || t === 'background'
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
  const userObjects = objects.filter((o) => o?.id != null && o?.eleType && !isFixedLayer(o))

  const nextLayers: LayerElement[] = userObjects.map((obj) => {
    const id = String(obj.id)
    return {
      id,
      visible: obj.visible ?? true,
      locked: obj.locked ?? false,
      selectable: obj.selectable ?? true,
      eleType: String(obj.eleType ?? ''),
      element: obj as MinimalFabricLike,
    }
  })

  layerStore.setLayers(nextLayers)
}

export function moveLayerToIndex(id: string, newIndex: number): void {
  const canvas = useCanvasStore().canvas
  if (!canvas) return

  const obj = resolveCanvasObjectById(String(id))
  if (!obj) return

  const objects = (canvas.getObjects?.() || []) as any[]
  const fixedCount = objects.filter((o) => isFixedLayer(o)).length
  const targetIndex = Math.max(0, fixedCount + Math.max(0, newIndex))

  canvas.moveObjectTo?.(obj as any, targetIndex)
  canvas.requestRenderAll?.()
  syncLayersFromCanvas()
}

export function applyOrder(idsInOrder: string[]): void {
  const canvas = useCanvasStore().canvas
  if (!canvas) return

  const objects = (canvas.getObjects?.() || []) as any[]
  const fixedCount = objects.filter((o) => isFixedLayer(o)).length

  idsInOrder
    .map(String)
    .forEach((id, idx) => {
      const obj = resolveCanvasObjectById(id)
      if (!obj) return
      canvas.moveObjectTo?.(obj as any, fixedCount + idx)
    })

  canvas.requestRenderAll?.()
  syncLayersFromCanvas()
}

export function bringToFront(id: string): void {
  const canvas = useCanvasStore().canvas
  if (!canvas) return

  const obj = resolveCanvasObjectById(String(id))
  if (!obj) return

  canvas.bringObjectToFront?.(obj as any)
  canvas.requestRenderAll?.()
  syncLayersFromCanvas()
}

export function sendToBack(id: string): void {
  const canvas = useCanvasStore().canvas
  if (!canvas) return

  const obj = resolveCanvasObjectById(String(id))
  if (!obj) return

  const objects = (canvas.getObjects?.() || []) as any[]
  const fixedCount = objects.filter((o) => isFixedLayer(o)).length
  canvas.moveObjectTo?.(obj as any, fixedCount)

  canvas.requestRenderAll?.()
  syncLayersFromCanvas()
}

export function bringForward(id: string): void {
  const canvas = useCanvasStore().canvas
  if (!canvas) return

  const obj = resolveCanvasObjectById(String(id))
  if (!obj) return

  canvas.bringObjectForward?.(obj as any)
  canvas.requestRenderAll?.()
  syncLayersFromCanvas()
}

export function sendBackward(id: string): void {
  const canvas = useCanvasStore().canvas
  if (!canvas) return

  const obj = resolveCanvasObjectById(String(id))
  if (!obj) return

  canvas.sendObjectBackwards?.(obj as any)
  canvas.requestRenderAll?.()
  syncLayersFromCanvas()
}

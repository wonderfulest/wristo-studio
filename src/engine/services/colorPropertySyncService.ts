import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import * as elementManager from '@/engine/managers/elementManager'
import {
  buildBoundColorPatches,
  type ColorBindingElementRecord,
} from './colorPropertySync'

export const syncColorPropertyToBoundElements = async (
  propertyKey: string,
  color: unknown,
): Promise<number> => {
  const canvasStore = useCanvasStore()
  const elementDataStore = useElementDataStore()
  const canvasElements = (canvasStore.canvas?.getObjects?.() || []) as unknown as ColorBindingElementRecord[]
  const storedElements = elementDataStore.elements.map((snapshot) => ({
    id: snapshot.id,
    ...(snapshot.config as unknown as ColorBindingElementRecord),
  }))
  const patches = buildBoundColorPatches(
    [...storedElements, ...canvasElements],
    propertyKey,
    color,
  )
  const canvasIds = new Set(
    canvasElements
      .filter((element) => element.id != null)
      .map((element) => String(element.id)),
  )

  await Promise.all(Array.from(patches.entries()).map(async ([id, patch]) => {
    if (canvasIds.has(id)) {
      await elementManager.updateElementById(id, patch)
      return
    }
    elementDataStore.patchElement(id, patch as any)
  }))

  canvasStore.canvas?.requestRenderAll?.()
  return patches.size
}

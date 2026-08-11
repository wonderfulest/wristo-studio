import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { LineSunEventsElementConfig } from '@/types/elements/sunEvents'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { buildLineSunEventObjects, createSunEventsGroup } from '../common/sunEvents.renderer'
import { encodeLineSunEvents } from './lineSunEvents.encoder'

export async function createLineSunEvents(input: LineSunEventsElementConfig): Promise<FabricElement> {
  const canvas = useCanvasStore().canvas
  if (!canvas) throw new Error('Canvas not initialized')
  const config = { ...input, id: input.id || nanoid(), indicator: { ...input.indicator }, phases: input.phases.map((phase) => ({ ...phase })) }
  const group = createSunEventsGroup(await buildLineSunEventObjects(config), config)
  canvas.add(group)
  useLayerStore().addLayer(group as any)
  useElementDataStore().upsertElement(encodeLineSunEvents(group as any) as any)
  canvas.setActiveObject(group)
  canvas.requestRenderAll()
  return group as unknown as FabricElement
}

export async function updateLineSunEvents(element: FabricElement, patch: Partial<LineSunEventsElementConfig>): Promise<void> {
  const group = element as any
  const current = encodeLineSunEvents(group)
  const next: LineSunEventsElementConfig = {
    ...current, ...patch,
    phases: patch.phases ? patch.phases.map((phase) => ({ ...phase })) : current.phases,
    indicator: { ...current.indicator, ...(patch.indicator ?? {}) },
  }
  group.remove(...group.getObjects())
  group.add(...await buildLineSunEventObjects(next))
  group.set({ left: next.left, top: next.top, angle: next.angle })
  group.__element = { config: structuredClone(next) }
  group.setCoords()
  useElementDataStore().upsertElement(next as any)
  useCanvasStore().canvas?.requestRenderAll()
}

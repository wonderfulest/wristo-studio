import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { LineSunEventsElementConfig } from '@/types/elements/sunEvents'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { buildLineSunEventObjects, createSunEventsGroup } from '../common/sunEvents.renderer'
import { encodeLineSunEvents } from './lineSunEvents.encoder'
import { scaleLineSunEventsConfig } from '../common/sunEvents.geometry'
import { normalizeSunEventIndicator } from '../common/sunEvents.defaults'

function attachScaleHandler(group: any): void {
  if (group.__sunEventsScaleHandlerBound) return
  group.__sunEventsScaleHandlerBound = true
  let committing = false

  group.on('modified', async () => {
    if (committing) return
    const scaleX = Number(group.scaleX ?? 1)
    const scaleY = Number(group.scaleY ?? 1)
    const current = encodeLineSunEvents(group)

    committing = true
    try {
      if (Math.abs(Math.abs(scaleX) - 1) >= 0.001 || Math.abs(Math.abs(scaleY) - 1) >= 0.001) {
        group.set({ scaleX: 1, scaleY: 1 })
        await updateLineSunEvents(group as FabricElement, scaleLineSunEventsConfig(
          current,
          scaleX,
          scaleY,
          Number(group.left ?? current.left),
          Number(group.top ?? current.top),
        ))
      } else {
        const next = {
          ...current,
          left: Math.round(Number(group.left ?? current.left)),
          top: Math.round(Number(group.top ?? current.top)),
          angle: Number(group.angle ?? current.angle),
        }
        group.__element = { config: structuredClone(next) }
        useElementDataStore().upsertElement(next as any)
      }
    } finally {
      committing = false
    }
  })
}

export async function createLineSunEvents(input: LineSunEventsElementConfig): Promise<FabricElement> {
  const canvas = useCanvasStore().canvas
  if (!canvas) throw new Error('Canvas not initialized')
  const config = { ...input, id: input.id || nanoid(), indicator: normalizeSunEventIndicator(input.indicator), phases: input.phases.map((phase) => ({ ...phase })) }
  const group = createSunEventsGroup(await buildLineSunEventObjects(config), config)
  attachScaleHandler(group)
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
  const { simulatedTime, ...persistentPatch } = patch as Partial<LineSunEventsElementConfig> & { simulatedTime?: Date }
  const next: LineSunEventsElementConfig = {
    ...current, ...persistentPatch,
    phases: patch.phases ? patch.phases.map((phase) => ({ ...phase })) : current.phases,
    indicator: { ...current.indicator, ...(patch.indicator ?? {}) },
  }
  group.remove(...group.getObjects())
  group.add(...await buildLineSunEventObjects(next, simulatedTime))
  group.set({ left: next.left, top: next.top, angle: next.angle })
  group.__element = { config: structuredClone(next) }
  group.setCoords()
  useElementDataStore().upsertElement(next as any)
  useCanvasStore().canvas?.requestRenderAll()
}

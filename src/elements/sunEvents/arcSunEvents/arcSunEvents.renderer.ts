import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { ArcSunEventsElementConfig } from '@/types/elements/sunEvents'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { buildArcSunEventObjects, createSunEventsGroup, setArcSunEventsCenterOffset } from '../common/sunEvents.renderer'
import { encodeArcSunEvents } from './arcSunEvents.encoder'
import { scaleArcSunEventsConfig } from '../common/sunEvents.geometry'

function attachScaleHandler(group: any): void {
  if (group.__sunEventsScaleHandlerBound) return
  group.__sunEventsScaleHandlerBound = true
  let committing = false

  group.on('modified', async () => {
    if (committing) return
    const scaleX = Number(group.scaleX ?? 1)
    const scaleY = Number(group.scaleY ?? 1)
    const scale = Math.max(Math.abs(scaleX), Math.abs(scaleY))
    const current = encodeArcSunEvents(group)

    committing = true
    try {
      if (Math.abs(scale - 1) >= 0.001) {
        group.set({ scaleX: 1, scaleY: 1 })
        await updateArcSunEvents(group as FabricElement, scaleArcSunEventsConfig(
          current,
          scale,
          Number(group.left ?? current.left),
          Number(group.top ?? current.top),
        ))
      } else {
        const next = {
          ...current,
          left: Math.round(Number(group.left ?? current.left)),
          top: Math.round(Number(group.top ?? current.top)),
        }
        group.__element = { config: structuredClone(next) }
        useElementDataStore().upsertElement(next as any)
      }
    } finally {
      committing = false
    }
  })
}

export async function createArcSunEvents(input: ArcSunEventsElementConfig): Promise<FabricElement> {
  const canvas = useCanvasStore().canvas
  if (!canvas) throw new Error('Canvas not initialized')
  const config = { ...input, id: input.id || nanoid(), indicator: { ...input.indicator }, phases: input.phases.map((phase) => ({ ...phase })) }
  const group = createSunEventsGroup(await buildArcSunEventObjects(config), config)
  attachScaleHandler(group)
  canvas.add(group)
  useLayerStore().addLayer(group as any)
  useElementDataStore().upsertElement(encodeArcSunEvents(group as any) as any)
  canvas.setActiveObject(group)
  canvas.requestRenderAll()
  return group as unknown as FabricElement
}

export async function updateArcSunEvents(element: FabricElement, patch: Partial<ArcSunEventsElementConfig>): Promise<void> {
  const group = element as any
  const current = encodeArcSunEvents(group)
  const next: ArcSunEventsElementConfig = {
    ...current, ...patch,
    phases: patch.phases ? patch.phases.map((phase) => ({ ...phase })) : current.phases,
    indicator: { ...current.indicator, ...(patch.indicator ?? {}) },
  }
  const objects = await buildArcSunEventObjects(next)
  setArcSunEventsCenterOffset(group, objects)
  group.remove(...group.getObjects())
  group.add(...objects)
  group.set({ left: next.left, top: next.top })
  group.__element = { config: structuredClone(next) }
  group.setCoords()
  useElementDataStore().upsertElement(next as any)
  useCanvasStore().canvas?.requestRenderAll()
}

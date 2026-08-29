import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { CurveSunEventsElementConfig } from '@/types/elements/sunEvents'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { buildCurveSunEventObjects, createSunEventsGroup } from '../common/sunEvents.renderer'
import { encodeCurveSunEvents } from './curveSunEvents.encoder'
import { scaleCurveSunEventsConfig } from '../common/sunEvents.geometry'
import { normalizeSunEventIndicator } from '../common/sunEvents.defaults'
import { createDefaultSunEventStyles } from '../common/sunEvents.model'

function attachScaleHandler(group: any): void {
  if (group.__sunEventsScaleHandlerBound) return
  group.__sunEventsScaleHandlerBound = true
  let committing = false

  group.on('modified', async () => {
    if (committing) return
    const scaleX = Number(group.scaleX ?? 1)
    const scaleY = Number(group.scaleY ?? 1)
    const current = encodeCurveSunEvents(group)

    committing = true
    try {
      if (Math.abs(Math.abs(scaleX) - 1) >= 0.001 || Math.abs(Math.abs(scaleY) - 1) >= 0.001) {
        group.set({ scaleX: 1, scaleY: 1 })
        await updateCurveSunEvents(group as FabricElement, scaleCurveSunEventsConfig(
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

export async function createCurveSunEvents(input: CurveSunEventsElementConfig): Promise<FabricElement> {
  const canvas = useCanvasStore().canvas
  if (!canvas) throw new Error('Canvas not initialized')
  const normalizedIndicator = normalizeSunEventIndicator(input.indicator)
  const config: CurveSunEventsElementConfig = {
    ...input,
    id: input.id || nanoid(),
    indicator: {
      ...normalizedIndicator,
      normalOffset: Number(normalizedIndicator.normalOffset ?? 0),
      orientation: normalizedIndicator.orientation === 'tangent' ? 'tangent' : 'fixed',
    },
    phases: (input.phases?.length ? input.phases : createDefaultSunEventStyles()).map((phase) => ({ ...phase })),
  }
  const group = createSunEventsGroup(await buildCurveSunEventObjects(config), config)
  attachScaleHandler(group)
  canvas.add(group)
  useLayerStore().addLayer(group as any)
  useElementDataStore().upsertElement(encodeCurveSunEvents(group as any) as any)
  canvas.setActiveObject(group)
  canvas.requestRenderAll()
  return group as unknown as FabricElement
}

export async function updateCurveSunEvents(
  element: FabricElement,
  patch: Partial<CurveSunEventsElementConfig>,
): Promise<void> {
  const group = element as any
  const current = encodeCurveSunEvents(group)
  const { simulatedTime, ...persistentPatch } = patch as Partial<CurveSunEventsElementConfig> & { simulatedTime?: Date }
  const next: CurveSunEventsElementConfig = {
    ...current,
    ...persistentPatch,
    phases: patch.phases ? patch.phases.map((phase) => ({ ...phase })) : current.phases,
    indicator: { ...current.indicator, ...(patch.indicator ?? {}) },
  }
  group.remove(...group.getObjects())
  group.add(...await buildCurveSunEventObjects(next, simulatedTime))
  group.set({ left: next.left, top: next.top, angle: next.angle })
  group.__element = { config: structuredClone(next) }
  group.setCoords()
  useElementDataStore().upsertElement(next as any)
  useCanvasStore().canvas?.requestRenderAll()
}

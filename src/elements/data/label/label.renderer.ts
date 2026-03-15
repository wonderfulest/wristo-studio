import type { FabricElement } from '@/types/element'
import type { LabelElementConfig } from '@/types/elements/data'
import { FabricText } from 'fabric'
import { nanoid } from 'nanoid'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { usePropertiesStore } from '@/stores/properties'
import { useElementDataStore } from '@/stores/elementDataStore'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'

export async function createLabel(config: LabelElementConfig): Promise<FabricElement> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()

  const canvas = canvasStore.canvas
  const id = nanoid()
  const metric = usePropertiesStore().getMetricByOptions(config)

  const element = new FabricText(metric.enLabel.short, {
    id,
    eleType: 'label',
    left: config.left,
    top: config.top,
    originX: (config.originX ?? 'center') as any,
    originY: (config.originY ?? 'center') as any,
    fill: (config.fill ?? '#ffffff') as any,
    fontSize: (config.fontSize ?? 14) as any,
    fontFamily: (config.fontFamily ?? 'roboto-condensed-regular') as any,
    dataProperty: config.dataProperty ?? null,
    goalProperty: config.goalProperty ?? null,
    selectable: true,
    hasControls: false,
    hasBorders: true,
  } as any)

  canvas?.add(element as any)
  layerStore.addLayer(element as any)
  canvas?.setActiveObject(element as any)
  canvas?.renderAll()

  elementDataStore.upsertElement({
    eleType: 'label',
    id: String(id),
    left: Math.round((element as any).left ?? config.left ?? 0),
    top: Math.round((element as any).top ?? config.top ?? 0),
    originX: ((element as any).originX as any) ?? 'center',
    originY: ((element as any).originY as any) ?? 'center',
    fill: (element.fill as any) ?? config.fill ?? '#ffffff',
    fontSize: Number((element.fontSize as any) ?? config.fontSize ?? 14),
    fontFamily: (element.fontFamily as any) ?? config.fontFamily ?? 'roboto-condensed-regular',
    dataProperty: (element as any).dataProperty ?? config.dataProperty ?? null,
    goalProperty: (element as any).goalProperty ?? config.goalProperty ?? null,
    metricSymbol: (element as any).metricSymbol ?? (config as any).metricSymbol ?? undefined,
    metricValue: (element as any).metricValue ?? (config as any).metricValue ?? undefined,
    topBase: encodeTopBaseForElement(element as any),
  } as any)

  return element as any
}

export function updateLabel(
  element: FabricElement,
  patch: Partial<LabelElementConfig> = {},
): void {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  const elementDataStore = useElementDataStore()
  if (!canvas) return

  const text = canvas.getObjects().find((obj: any) => obj.id === (element as any).id)
  if (!text) return

  const currentLeft = (text as any).left
  const currentTop = (text as any).top

  const updates: Record<string, any> = {
    text: (patch as any).text,
    fill: patch.fill,
    fontSize: patch.fontSize,
    fontFamily: patch.fontFamily,
    left: patch.left,
    top: patch.top,
    originX: patch.originX,
    originY: patch.originY,
    metricSymbol: patch.metricSymbol,
    metricValue: patch.metricValue,
    dataProperty: patch.dataProperty,
    goalProperty: patch.goalProperty,
  }

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      if (key === 'text') {
        (text as any).set('text', value)
      } else {
        (text as any).set(key, value)
      }
    }
  })

  if (patch.left === undefined) (text as any).set('left', currentLeft)
  if (patch.top === undefined) (text as any).set('top', currentTop)

  ;(text as any).setCoords()
  canvas.requestRenderAll?.()

  const textId = (text as any).id
  if (textId != null) {
    const encoded = {
      id: (text as any).id ?? '',
      eleType: 'label' as const,
      left: (text as any).left,
      top: (text as any).top,
      originX: (text as any).originX as any,
      originY: (text as any).originY as any,
      fill: ((text as any).fill as string) ?? '#ffffff',
      fontSize: Number((text as any).fontSize ?? 14),
      fontFamily: ((text as any).fontFamily as string) ?? '',
      dataProperty: (text as any).dataProperty ?? undefined,
      goalProperty: (text as any).goalProperty ?? undefined,
      metricSymbol: (text as any).metricSymbol ?? undefined,
      metricValue: (text as any).metricValue ?? undefined,
      topBase: encodeTopBaseForElement(text as any),
    } as LabelElementConfig

    elementDataStore.patchElement(String(textId), encoded as any)
  }
}

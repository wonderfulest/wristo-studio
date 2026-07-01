import type { FabricElement } from '@/types/element'
import type { UnitElementConfig } from '@/types/elements/data'
import { FabricText } from 'fabric'
import { nanoid } from 'nanoid'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { usePropertiesStore } from '@/stores/properties'
import { useDesignStore } from '@/stores/designStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'
import { resolveMetricUnit } from '@/utils/metricLabel'

const resolveUnitText = (config: Partial<UnitElementConfig>): string => {
  const metric = usePropertiesStore().getMetricByOptions(config)
  const designStore = useDesignStore()
  return resolveMetricUnit(metric, designStore.supportsChineseContent ? 'zh' : 'en')
}

export async function createUnit(config: UnitElementConfig): Promise<FabricElement> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()
  const id = config.id || nanoid()
  const text = resolveUnitText(config)

  const element = new FabricText(text, {
    id,
    eleType: 'unit',
    left: config.left,
    top: config.top,
    originX: (config.originX ?? 'left') as any,
    originY: (config.originY ?? 'center') as any,
    fill: (config.fill ?? '#ffffff') as any,
    fontSize: (config.fontSize ?? 16) as any,
    fontFamily: (config.fontFamily ?? 'roboto-condensed-regular') as any,
    dataProperty: config.dataProperty ?? undefined,
    goalProperty: config.goalProperty ?? undefined,
    metricSymbol: config.metricSymbol ?? '',
    metricValue: text,
    selectable: true,
    hasControls: false,
    hasBorders: true,
  } as any)

  const canvas = canvasStore.canvas
  canvas?.add(element as any)
  layerStore.addLayer(element as any)
  canvas?.setActiveObject(element as any)
  canvas?.renderAll()

  elementDataStore.upsertElement({
    eleType: 'unit',
    id: String(id),
    left: Math.round((element as any).left ?? config.left ?? 0),
    top: Math.round((element as any).top ?? config.top ?? 0),
    originX: ((element as any).originX as any) ?? 'left',
    originY: ((element as any).originY as any) ?? 'center',
    fill:
      typeof (element as any).fill === 'string'
        ? ((element as any).fill as string)
        : '#ffffff',
    fontSize: Number((element as any).fontSize ?? config.fontSize ?? 16),
    fontFamily: String(
      (element as any).fontFamily ??
        config.fontFamily ??
        'roboto-condensed-regular',
    ),
    dataProperty: (element as any).dataProperty ?? undefined,
    goalProperty: (element as any).goalProperty ?? undefined,
    metricSymbol: String((element as any).metricSymbol ?? config.metricSymbol ?? ''),
    metricValue: text,
    topBase: encodeTopBaseForElement(element as any),
  } as any)

  return element as any
}

export function updateUnit(
  element: FabricElement,
  patch: Partial<UnitElementConfig> = {},
): void {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas) return

  const obj: any = canvas
    .getObjects()
    .find((o: any) => (o as any).id === (element as any).id)
  if (!obj) return

  const currentLeft = obj.left
  const currentTop = obj.top

  const updateProps: Record<string, any> = {
    fill: patch.fill,
    fontSize: patch.fontSize,
    fontFamily: patch.fontFamily,
    originX: patch.originX,
    originY: patch.originY,
    left: patch.left,
    top: patch.top,
    dataProperty: patch.dataProperty,
    goalProperty: patch.goalProperty,
    metricSymbol: patch.metricSymbol,
  }

  Object.entries(updateProps).forEach(([key, value]) => {
    if (value !== undefined) obj.set(key, value)
  })

  if (patch.left === undefined) obj.set('left', currentLeft)
  if (patch.top === undefined) obj.set('top', currentTop)

  const nextText = resolveUnitText({
    dataProperty: obj.dataProperty,
    goalProperty: obj.goalProperty,
    metricSymbol: obj.metricSymbol,
  })
  obj.set('text', nextText)
  obj.metricValue = nextText

  obj.setCoords()
  canvas.renderAll()

  if (obj.id != null) {
    useElementDataStore().patchElement(String(obj.id), {
      eleType: 'unit',
      id: String(obj.id ?? ''),
      left: Math.round(obj.left),
      top: Math.round(obj.top),
      originX: (obj.originX as any) ?? 'left',
      originY: (obj.originY as any) ?? 'center',
      fill:
        typeof (obj.fill as any) === 'string'
          ? ((obj.fill as any) as string)
          : '#ffffff',
      fontSize: Number((obj.fontSize as any) ?? 16),
      fontFamily: String(
        (obj.fontFamily as any) ?? 'roboto-condensed-regular',
      ),
      dataProperty: (obj as any).dataProperty ?? undefined,
      goalProperty: (obj as any).goalProperty ?? undefined,
      metricSymbol: String((obj as any).metricSymbol ?? ''),
      metricValue: nextText,
      topBase: encodeTopBaseForElement(obj as any),
    } as any)
  }
}

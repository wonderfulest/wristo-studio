import type { FabricElement } from '@/types/element'
import type { DataElementConfig } from '@/types/elements/data'
import { FabricText } from 'fabric'
import { nanoid } from 'nanoid'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { usePropertiesStore } from '@/stores/properties'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'
import { useElementDataStore } from '@/stores/elementDataStore'
import { getDisplayState, normalizeDisplayStates } from '@/utils/displayStates'

export async function createData(config: DataElementConfig): Promise<FabricElement> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()

  const id = config.id || nanoid()
  const metric = usePropertiesStore().getMetricByOptions(config)
  const displayStates = normalizeDisplayStates(config.displayStates)
  const element = new FabricText(metric.defaultValue, {
    id,
    eleType: 'data',
    left: config.left,
    top: config.top,
    originX: (config.originX ?? 'center') as any,
    originY: (config.originY ?? 'center') as any,
    fill: config.fill as any,
    fontSize: config.fontSize as any,
    fontFamily: config.fontFamily as any,
    dataProperty: config.dataProperty ?? undefined,
    goalProperty: config.goalProperty ?? undefined,
    metricSymbol: (config as any).metricSymbol ?? '',
    displayStates,
    visible: getDisplayState(displayStates, layerStore.previewMode),
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
    eleType: 'data',
    id: String(id),
    left: Math.round((element as any).left ?? config.left ?? 0),
    top: Math.round((element as any).top ?? config.top ?? 0),
    originX: ((element as any).originX as any) ?? 'center',
    originY: ((element as any).originY as any) ?? 'center',
    fill:
      typeof (element as any).fill === 'string'
        ? ((element as any).fill as string)
        : '#ffffff',
    fontSize: Number(((element as any).fontSize as any) ?? config.fontSize ?? 14),
    fontFamily: String(
      ((element as any).fontFamily as any) ??
        config.fontFamily ??
        'roboto-condensed-regular',
    ),
    dataProperty: (element as any).dataProperty ?? null,
    goalProperty: (element as any).goalProperty ?? null,
    metricSymbol: String(
      (element as any).metricSymbol ?? (config as any).metricSymbol ?? '',
    ),
    displayStates,
    topBase: encodeTopBaseForElement(element as any),
  } as any)

  return element as any
}

export function updateData(
  element: FabricElement,
  patch: Partial<DataElementConfig> = {},
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
    displayStates: patch.displayStates ? normalizeDisplayStates(patch.displayStates) : undefined,
  }

  Object.keys(updateProps).forEach((key) => {
    const value = updateProps[key]
    if (value !== undefined) obj.set(key, value)
  })

  if (patch.displayStates !== undefined) {
    obj.set('visible', getDisplayState(normalizeDisplayStates(patch.displayStates), useLayerStore().previewMode))
  }

  if (patch.left === undefined) obj.set('left', currentLeft)
  if (patch.top === undefined) obj.set('top', currentTop)

  obj.setCoords()
  canvas.renderAll()

  const elementDataStore = useElementDataStore()
  if (obj.id != null) {
    const encoded = {
      eleType: 'data' as const,
      id: String(obj.id ?? ''),
      left: Math.round(obj.left),
      top: Math.round(obj.top),
      originX: (obj.originX as any) ?? 'center',
      originY: (obj.originY as any) ?? 'center',
      fill:
        typeof (obj.fill as any) === 'string'
          ? ((obj.fill as any) as string)
          : '#ffffff',
      fontSize: Number((obj.fontSize as any) ?? 14),
      fontFamily: String(
        (obj.fontFamily as any) ?? 'roboto-condensed-regular',
      ),
      dataProperty: (obj as any).dataProperty ?? undefined,
      goalProperty: (obj as any).goalProperty ?? undefined,
      metricSymbol: String((obj as any).metricSymbol ?? ''),
      displayStates: normalizeDisplayStates((obj as any).displayStates),
      topBase: encodeTopBaseForElement(obj as any),
    } satisfies DataElementConfig

    elementDataStore.patchElement(String(obj.id), encoded as any)
  }
}

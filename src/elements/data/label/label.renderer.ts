import type { FabricElement } from '@/types/element'
import type { LabelElementConfig } from '@/types/elements/data'
import { FabricText } from 'fabric'
import { nanoid } from 'nanoid'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { usePropertiesStore } from '@/stores/properties'
import { useDesignStore } from '@/stores/designStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'
import { applyMetricTextCase, resolveMetricLabel } from '@/utils/metricLabel'
import { getDisplayState, normalizeDisplayStates } from '@/utils/displayStates'

export async function createLabel(config: LabelElementConfig): Promise<FabricElement> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()

  const canvas = canvasStore.canvas
  const id = nanoid()
  const metric = usePropertiesStore().getMetricByOptions(config)
  const propertiesStore = usePropertiesStore()
  const designStore = useDesignStore()
  const labelText = applyMetricTextCase(
    resolveMetricLabel(metric, designStore.supportsChineseContent ? 'zh' : 'en'),
    (propertiesStore as any).textCase,
  )
  const displayStates = normalizeDisplayStates(config.displayStates)

  const element = new FabricText(labelText, {
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
    displayStates,
    visible: getDisplayState(displayStates, layerStore.previewMode),
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
    text: labelText,
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
    displayStates,
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
    displayStates: patch.displayStates ? normalizeDisplayStates(patch.displayStates) : undefined,
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

  if (patch.displayStates !== undefined) {
    ;(text as any).set('visible', getDisplayState(normalizeDisplayStates(patch.displayStates), useLayerStore().previewMode))
  }

  if (patch.left === undefined) (text as any).set('left', currentLeft)
  if (patch.top === undefined) (text as any).set('top', currentTop)

  ;(text as any).setCoords()
  canvas.requestRenderAll?.()

  const textId = (text as any).id
  if (textId != null) {
    const encoded = {
      id: (text as any).id ?? '',
      eleType: 'label' as const,
      text: String((text as any).text ?? ''),
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
      displayStates: normalizeDisplayStates((text as any).displayStates),
      topBase: encodeTopBaseForElement(text as any),
    } as LabelElementConfig

    elementDataStore.patchElement(String(textId), encoded as any)
  }
}

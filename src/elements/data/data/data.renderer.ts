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
import type { ElementUpdateContext } from '@/engine/registry/elementRegistry'
import { applyCurrentElementPreviewFont, resolveCurrentElementPreviewFont } from '@/composables/useGarminSystemFont'
import { savedTextStyle } from '@/features/bitmap-font-maker/recipePreview'
import { getPersistedTextFont, getSavedFontFamily } from '@/utils/systemFontElement'
import { useDataCatalogStore } from '@/stores/dataCatalogStore'
import { requireCanonicalMetric } from '@/utils/metricLabel'

export async function createData(config: DataElementConfig): Promise<FabricElement> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()

  const id = config.id || nanoid()
  const metric = usePropertiesStore().getMetricByOptions(config)
  const catalog = useDataCatalogStore().snapshot
  if (!catalog) throw new Error('data catalog: snapshot is missing')
  const canonicalMetric = requireCanonicalMetric(metric ?? config, catalog)
  const displayStates = normalizeDisplayStates(config.displayStates)
  const previewFont = resolveCurrentElementPreviewFont(config, canonicalMetric.defaultValue)
  const element = new FabricText(canonicalMetric.defaultValue, {
    id,
    eleType: 'data',
    left: config.left,
    top: config.top,
    originX: (config.originX ?? 'center') as any,
    originY: (config.originY ?? 'center') as any,
    fill: config.fill as any,
    fillProperty: config.fillProperty ?? undefined,
    fontSize: previewFont.fontSize as any,
    fontFamily: previewFont.fontFamily as any,
    dataProperty: config.dataProperty ?? undefined,
    goalProperty: config.goalProperty ?? undefined,
    metricSymbol: (config as any).metricSymbol ?? '',
    displayStates,
    visible: getDisplayState(displayStates, layerStore.previewMode),
    selectable: true,
    hasControls: false,
    hasBorders: true,
  } as any)
  applyCurrentElementPreviewFont(element, config, canonicalMetric.defaultValue)

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
    fill: (savedTextStyle(element).fill as string) ?? '#ffffff',
    fillProperty: (element as any).fillProperty ?? config.fillProperty ?? undefined,
    ...getPersistedTextFont(config, element),
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
  context: ElementUpdateContext = {},
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
    fillProperty: patch.fillProperty,
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

  applyCurrentElementPreviewFont(obj, {
    fontFamily: patch.fontFamily ?? getSavedFontFamily(obj), fontSize: obj.fontSize, fill: patch.fill,
  }, obj.text)

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
      fill: (savedTextStyle(obj).fill as string) ?? '#ffffff',
      fillProperty: (obj as any).fillProperty ?? undefined,
      fontSize: Number((obj.fontSize as any) ?? 14),
      fontFamily: getSavedFontFamily(obj, 'roboto-condensed-regular'),
      dataProperty: (obj as any).dataProperty ?? undefined,
      goalProperty: (obj as any).goalProperty ?? undefined,
      metricSymbol: String((obj as any).metricSymbol ?? ''),
      displayStates: normalizeDisplayStates((obj as any).displayStates),
      topBase: encodeTopBaseForElement(obj as any),
    } satisfies DataElementConfig

    if (context.persist !== false) elementDataStore.patchElement(String(obj.id), encoded as any)
  }
}

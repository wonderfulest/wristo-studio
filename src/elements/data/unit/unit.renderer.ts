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
import { requireCanonicalMetric, resolveMetricUnit } from '@/utils/metricLabel'
import { useDataCatalogStore } from '@/stores/dataCatalogStore'
import { getDisplayState, normalizeDisplayStates } from '@/utils/displayStates'
import type { ElementUpdateContext } from '@/engine/registry/elementRegistry'
import { applyCurrentElementPreviewFont, resolveCurrentElementPreviewFont } from '@/composables/useGarminSystemFont'
import { savedTextStyle } from '@/features/bitmap-font-maker/recipePreview'
import { resolveDesignContentLanguage } from '@/utils/effectiveDisplayLocale'
import { getPersistedTextFont } from '@/utils/systemFontElement'

const resolveUnitText = (config: Partial<UnitElementConfig>): string => {
  const metric = usePropertiesStore().getMetricByOptions(config)
  const designStore = useDesignStore()
  const catalog = useDataCatalogStore().snapshot
  if (!catalog) throw new Error('data catalog: snapshot is missing')
  return resolveMetricUnit(requireCanonicalMetric(metric ?? config, catalog), resolveDesignContentLanguage(designStore), catalog)
}

export async function createUnit(config: UnitElementConfig): Promise<FabricElement> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()
  const id = config.id || nanoid()
  const text = resolveUnitText(config)
  const displayStates = normalizeDisplayStates(config.displayStates)
  const previewFont = resolveCurrentElementPreviewFont(config, text)

  const element = new FabricText(text, {
    id,
    eleType: 'unit',
    left: config.left,
    top: config.top,
    originX: (config.originX ?? 'left') as any,
    originY: (config.originY ?? 'center') as any,
    fill: (config.fill ?? '#ffffff') as any,
    fontSize: (previewFont.fontSize ?? 16) as any,
    fontFamily: (previewFont.fontFamily ?? 'roboto-condensed-regular') as any,
    dataProperty: config.dataProperty ?? undefined,
    goalProperty: config.goalProperty ?? undefined,
    metricSymbol: config.metricSymbol ?? '',
    metricValue: text,
    displayStates,
    visible: getDisplayState(displayStates, layerStore.previewMode),
    selectable: true,
    hasControls: false,
    hasBorders: true,
  } as any)
  applyCurrentElementPreviewFont(element, config, text)

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
    fill: (savedTextStyle(element).fill as string) ?? '#ffffff',
    ...getPersistedTextFont(config, element),
    dataProperty: (element as any).dataProperty ?? undefined,
    goalProperty: (element as any).goalProperty ?? undefined,
    metricSymbol: String((element as any).metricSymbol ?? config.metricSymbol ?? ''),
    metricValue: text,
    displayStates,
    topBase: encodeTopBaseForElement(element as any),
  } as any)

  return element as any
}

export function updateUnit(
  element: FabricElement,
  patch: Partial<UnitElementConfig> = {},
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

  Object.entries(updateProps).forEach(([key, value]) => {
    if (value !== undefined) obj.set(key, value)
  })

  if (patch.displayStates !== undefined) {
    obj.set('visible', getDisplayState(normalizeDisplayStates(patch.displayStates), useLayerStore().previewMode))
  }

  if (patch.left === undefined) obj.set('left', currentLeft)
  if (patch.top === undefined) obj.set('top', currentTop)

  const nextText = resolveUnitText({
    dataProperty: obj.dataProperty,
    goalProperty: obj.goalProperty,
    metricSymbol: obj.metricSymbol,
  })
  obj.set('text', nextText)
  obj.metricValue = nextText

  applyCurrentElementPreviewFont(obj, {
    fontFamily: obj.fontFamily, fontSize: obj.fontSize, fill: patch.fill,
  }, nextText)

  obj.setCoords()
  canvas.renderAll()

  if (context.persist !== false && obj.id != null) {
    useElementDataStore().patchElement(String(obj.id), {
      eleType: 'unit',
      id: String(obj.id ?? ''),
      left: Math.round(obj.left),
      top: Math.round(obj.top),
      originX: (obj.originX as any) ?? 'left',
      originY: (obj.originY as any) ?? 'center',
      fill: (savedTextStyle(obj).fill as string) ?? '#ffffff',
      fontSize: Number((obj.fontSize as any) ?? 16),
      fontFamily: String(
        (obj.fontFamily as any) ?? 'roboto-condensed-regular',
      ),
      dataProperty: (obj as any).dataProperty ?? undefined,
      goalProperty: (obj as any).goalProperty ?? undefined,
      metricSymbol: String((obj as any).metricSymbol ?? ''),
      metricValue: nextText,
      displayStates: normalizeDisplayStates((obj as any).displayStates),
      topBase: encodeTopBaseForElement(obj as any),
    } as any)
  }
}

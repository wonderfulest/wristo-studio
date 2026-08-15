import type { FabricElement } from '@/types/element'
import type { LabelElementConfig } from '@/types/elements/data'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'
import { useDesignStore } from '@/stores/designStore'
import { resolveDesignContentLanguage } from '@/utils/effectiveDisplayLocale'
import { usePropertiesStore } from '@/stores/properties'
import { applyMetricTextCase, requireCanonicalMetric, resolveMetricLabel } from '@/utils/metricLabel'
import { useDataCatalogStore } from '@/stores/dataCatalogStore'
import { getSavedFontFamily, getSavedFontSize } from '@/utils/systemFontElement'
import { savedTextStyle } from '@/features/bitmap-font-maker/recipePreview'

export function encodeLabel(element: FabricElement): LabelElementConfig {
  if (!element) throw new Error('Invalid element')

  const config: LabelElementConfig = {
    id: (element.id as any) ?? '',
    eleType: 'label',
    left: element.left,
    top: element.top,
    originX: element.originX as any,
    originY: element.originY as any,
    fill: (savedTextStyle(element).fill as string) ?? '#ffffff',
    fillProperty: (element as any).fillProperty ?? undefined,
    fontSize: getSavedFontSize(element, 14),
    fontFamily: getSavedFontFamily(element),
    dataProperty: (element as any).dataProperty ?? undefined,
    goalProperty: (element as any).goalProperty ?? undefined,
    metricSymbol: (element as any).metricSymbol ?? undefined,
    metricValue: (element as any).metricValue ?? undefined,
    text:
      typeof (element as any).text === 'string'
        ? (element as any).text
        : '',
    topBase: encodeTopBaseForElement(element as any),
  }

  if (config.dataProperty == null && config.goalProperty == null) {
    const eleId = String(element.id ?? '')
    const eleType = String((element as any).eleType ?? 'data')
    const eleLeft = Math.round(Number((element as any).left ?? config.left ?? 0))
    const eleTop = Math.round(Number((element as any).top ?? config.top ?? 0))
    throw new Error(
      `Invalid element: dataProperty and goalProperty are both null (type=${eleType}, id=${eleId}, left=${eleLeft}, top=${eleTop})`,
    )
  }

  return config
}

export function decodeLabel(config: LabelElementConfig): Partial<FabricElement> {
  const propertiesStore = usePropertiesStore()
  const metric = propertiesStore.getMetricByOptions({
    dataProperty: config.dataProperty,
    goalProperty: config.goalProperty,
    metricSymbol: config.metricSymbol,
  })
  const designStore = useDesignStore()
  const catalog = useDataCatalogStore().snapshot
  if (!catalog) throw new Error('data catalog: snapshot is missing')
  const text = applyMetricTextCase(
    resolveMetricLabel(requireCanonicalMetric(metric ?? config, catalog), resolveDesignContentLanguage(designStore)),
    (propertiesStore as any).textCase,
  )

  const element: Partial<FabricElement> = {
    id: config.id,
    eleType: 'label',
    text,
    left: config.left,
    top: config.top,
    originX: config.originX as any,
    originY: config.originY as any,
    fill: config.fill,
    fillProperty: config.fillProperty ?? undefined,
    fontSize: config.fontSize,
    fontFamily: config.fontFamily,
    dataProperty: config.dataProperty,
    goalProperty: config.goalProperty,
    metricSymbol: config.metricSymbol,
    metricValue: config.metricValue,
  }

  return element
}

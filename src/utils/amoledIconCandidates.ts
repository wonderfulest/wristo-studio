import { usePropertiesStore } from '@/stores/properties'
import type { AmoledIconCandidate } from '@/types/amoledIcons'
import { normalizeIconUnicode } from '@/types/amoledIcons'
import type { AnyElementConfig } from '@/types/elements'
import { useDataCatalogStore } from '@/stores/dataCatalogStore'
import { requireCanonicalMetric, resolveMetricLabel } from '@/utils/metricLabel'
import { resolveMetricIconUnicode } from '@/utils/metricIcon'
import type { DataTypeOption } from '@/types/dataCatalog'

const findDataOption = (input: { metricSymbol?: string; iconUnicode?: string }) => {
  const iconUnicode = normalizeIconUnicode(input.iconUnicode)
  return useDataCatalogStore().options.find((option) => {
    if (input.metricSymbol && option.metricSymbol === input.metricSymbol) return true
    return iconUnicode && normalizeIconUnicode(option.iconUnicode) === iconUnicode
  })
}

export const getAmoledIconCandidateFromElement = (element: Partial<AnyElementConfig> | null | undefined): AmoledIconCandidate | null => {
  if (!element || (element as any).eleType !== 'icon') return null
  const metricSymbol = String((element as any).metricSymbol || '').trim()
  let option: DataTypeOption | object | undefined
  const dataProperty = String((element as any).dataProperty || '').trim()
  const goalProperty = String((element as any).goalProperty || '').trim()
  if (dataProperty || goalProperty) {
    option = usePropertiesStore().getMetricByOptions({ dataProperty, goalProperty, metricSymbol })
  }
  if (!option) option = findDataOption({ metricSymbol })
  const catalog = useDataCatalogStore().snapshot
  if (!catalog) throw new Error('data catalog: snapshot is missing')
  const canonicalOption = requireCanonicalMetric(option, catalog)
  const iconUnicode = resolveMetricIconUnicode(canonicalOption, (element as any).iconUnicode, (element as any).text)
  if (!iconUnicode) return null
  return {
    iconUnicode,
    symbolCode: String(canonicalOption.valueCode),
    metricSymbol: canonicalOption.metricSymbol,
    label: resolveMetricLabel(canonicalOption, 'en'),
    source: 'from-element',
  }
}

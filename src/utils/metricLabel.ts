import type { DataTypeOption, ValidatedDataCatalog } from '@/types/dataCatalog'
import type { DataLabelLength } from '@/types/localization'
import { useDesignStore } from '@/stores/designStore'
import { resolveUnitLabel, resolveUnitVariant, type PreviewDeviceContext } from '@/utils/unitResolver'

export type MetricLabelLanguage = 'en' | 'zh'

export function requireCanonicalMetric(
  metric: object | null | undefined,
  catalog: Pick<ValidatedDataCatalog, 'optionsByValueCode' | 'optionsByMetricSymbol'>,
): DataTypeOption {
  const identity = metric as { readonly value?: unknown; readonly valueCode?: unknown; readonly metricSymbol?: unknown } | null | undefined
  const rawValueCode = identity?.valueCode ?? identity?.value
  const hasValueCode = rawValueCode !== undefined && rawValueCode !== null
  let valueCode: number | undefined
  if (hasValueCode) {
    const validNumber = typeof rawValueCode === 'number' && Number.isFinite(rawValueCode) && Number.isInteger(rawValueCode)
    const normalizedString = typeof rawValueCode === 'string' ? rawValueCode.trim() : ''
    const validString = typeof rawValueCode === 'string' && /^(0|[1-9]\d*)$/.test(normalizedString)
    if (!validNumber && !validString) {
      throw new Error(`data type option valueCode "${String(rawValueCode)}": must be a finite integer`)
    }
    valueCode = validNumber ? rawValueCode as number : Number(normalizedString)
  }
  const symbol = typeof identity?.metricSymbol === 'string' ? identity.metricSymbol : ''
  const option = hasValueCode
    ? catalog.optionsByValueCode.get(valueCode as number)
    : catalog.optionsByMetricSymbol.get(symbol)
  const identityMatches = option && (!symbol || option.metricSymbol === symbol)
  if (identityMatches) return option
  const identityText = hasValueCode ? String(valueCode) : symbol || 'unknown'
  throw new Error(`data type option ${identityText}: canonical definition is missing`)
}

export function resolveMetricLabel(metric: DataTypeOption, language: MetricLabelLanguage, length?: DataLabelLength): string {
  if (language === 'zh') return metric.label.zhs
  return metric.label.eng[length ?? useDesignStore().dataLabelLength]
}

export function resolveMetricUnit(
  metric: DataTypeOption,
  language: MetricLabelLanguage,
  catalog: Pick<ValidatedDataCatalog, 'unitsByKey' | 'aliasOwners'>,
  rawAlias?: string,
  previewContext?: Omit<PreviewDeviceContext, 'language'>,
): string {
  const unit = catalog.unitsByKey.get(metric.unitKey)
  if (!unit) throw new Error(`unitKey ${metric.unitKey}: definition is missing`)
  const context: PreviewDeviceContext = {
    language: language === 'zh' ? 'zhs' : 'eng',
    distanceUnits: previewContext?.distanceUnits ?? 'metric',
    temperatureUnits: previewContext?.temperatureUnits ?? 'metric',
  }
  const variantKey = resolveUnitVariant(unit, context, rawAlias)
  return resolveUnitLabel(unit, variantKey, context.language)
}

export function applyMetricTextCase(text: string, textCase: number | undefined): string {
  const value = String(text ?? '')
  if (textCase === 1) return value.toUpperCase()
  if (textCase === 2) return value.toLowerCase()
  if (textCase === 0 || textCase === 3) return value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  return value
}

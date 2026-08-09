import type { DataTypeOption, ValidatedDataCatalog } from '@/types/dataCatalog'

export type MetricLabelLanguage = 'en' | 'zh'

export function requireCanonicalMetric(
  metric: object | null | undefined,
  catalog: Pick<ValidatedDataCatalog, 'dataTypeOptions'>,
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
    ? catalog.dataTypeOptions.find((candidate) => candidate.valueCode === valueCode && (!symbol || candidate.metricSymbol === symbol))
    : catalog.dataTypeOptions.find((candidate) => symbol !== '' && candidate.metricSymbol === symbol)
  if (option) return option
  const identityText = hasValueCode ? String(valueCode) : symbol || 'unknown'
  throw new Error(`data type option ${identityText}: canonical definition is missing`)
}

export function resolveMetricLabel(metric: DataTypeOption, language: MetricLabelLanguage): string {
  return language === 'zh' ? metric.label.zhs : metric.label.eng
}

export function resolveMetricUnit(
  metric: DataTypeOption,
  language: MetricLabelLanguage,
  catalog: Pick<ValidatedDataCatalog, 'unitsByKey' | 'aliasOwners'>,
  rawAlias?: string,
): string {
  const unit = catalog.unitsByKey.get(metric.unitKey)
  if (!unit) throw new Error(`unitKey ${metric.unitKey}: definition is missing`)
  if (metric.unitKey === 'none') return ''

  let variantKey = unit.defaultVariant
  if (rawAlias !== undefined) {
    const normalizedAlias = rawAlias.trim().toLowerCase()
    const owner = catalog.aliasOwners.get(normalizedAlias)
    variantKey = owner?.unitKey === metric.unitKey ? owner.variantKey : null
  }
  const variant = variantKey ? unit.variants[variantKey] : undefined
  if (!variant) {
    throw new Error(`unitKey ${metric.unitKey}: unknown runtime unit alias "${rawAlias}"`)
  }
  return language === 'zh' ? variant.label.zhs : variant.label.eng
}

export function applyMetricTextCase(text: string, textCase: number | undefined): string {
  const value = String(text ?? '')
  if (textCase === 1) return value.toUpperCase()
  if (textCase === 2) return value.toLowerCase()
  if (textCase === 0 || textCase === 3) return value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  return value
}

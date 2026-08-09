import type { DataTypeOption, ValidatedDataCatalog } from '@/types/dataCatalog'
import { resolveUnitLabel, resolveUnitVariant, type PreviewDeviceContext } from '@/utils/unitResolver'

export interface MetricSourceValue {
  readonly rawValue: unknown
  readonly displayValue: string
  readonly providerUnit?: string
}

export interface MetricDisplayResult {
  readonly rawValue: unknown
  readonly displayValue: string
  readonly unitKey: string
  readonly variantKey: string | null
  readonly unitLabel: string
}

export function resolveMetricDisplayResult(
  metric: DataTypeOption,
  source: MetricSourceValue,
  context: PreviewDeviceContext,
  catalog: Pick<ValidatedDataCatalog, 'unitsByKey'>,
): MetricDisplayResult {
  const unit = catalog.unitsByKey.get(metric.unitKey)
  if (!unit) throw new Error(`unitKey ${metric.unitKey}: definition is missing`)
  const variantKey = resolveUnitVariant(unit, context, source.providerUnit)
  const displayValue = formatForVariant(metric, unit.unitKey, variantKey, source)
  return {
    rawValue: source.rawValue,
    displayValue,
    unitKey: metric.unitKey,
    variantKey,
    unitLabel: resolveUnitLabel(unit, variantKey, context.language),
  }
}

function formatForVariant(
  metric: DataTypeOption,
  unitKey: string,
  variantKey: string | null,
  source: MetricSourceValue,
): string {
  if (typeof source.rawValue !== 'number' || !Number.isFinite(source.rawValue)) return source.displayValue
  let value = source.rawValue
  if (unitKey === 'distance' && isVariant(variantKey, 'mi', 'imperial')) value *= 0.621371
  else if (unitKey === 'length' && isVariant(variantKey, 'ft', 'imperial')) value *= 3.28084
  else if (unitKey === 'length' && variantKey === 'imperial_thousands') value *= 0.00328084
  else if (unitKey === 'temperature' && isVariant(variantKey, 'fahrenheit')) value = value * 9 / 5 + 32
  else if (unitKey === 'speed' && isVariant(variantKey, 'miles_per_hour', 'mph')) value *= 2.23694

  if (value === source.rawValue && metric.unitKey !== 'temperature') return source.displayValue
  const decimalIndex = source.displayValue.indexOf('.')
  const digits = decimalIndex < 0 ? 0 : source.displayValue.length - decimalIndex - 1
  return value.toFixed(digits)
}

const isVariant = (variantKey: string | null, ...keys: string[]): boolean =>
  variantKey !== null && keys.includes(variantKey)

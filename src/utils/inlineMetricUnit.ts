// Temperature values carry a degree mark even when standalone units are disabled.
const TEMPERATURE_METRIC_SYMBOLS = new Set([
  ':FIELD_TYPE_TEMPERATURE',
  ':FIELD_TYPE_FEELS_LIKE_TEMPERATURE',
  ':FIELD_TYPE_TEMPERATURE_HIGH',
  ':FIELD_TYPE_TEMPERATURE_LOW',
  ':FIELD_TYPE_TEMPERATURE_RANGE',
  ':FIELD_TYPE_SENSOR_TEMPERATURE',
  ':FIELD_TYPE_WEATHER',
])

const INLINE_UNIT_SUFFIXES: Readonly<Record<string, string>> = Object.freeze({ temperature: '°' })

export function resolveInlineMetricUnitSuffix(unitKey: string, metricSymbol?: string): string | null {
  if (metricSymbol && TEMPERATURE_METRIC_SYMBOLS.has(metricSymbol)) return '°'
  return INLINE_UNIT_SUFFIXES[unitKey] ?? null
}

export function formatInlineMetricUnit(unitKey: string, displayValue: string, metricSymbol?: string): string {
  const value = String(displayValue ?? '')
  const suffix = resolveInlineMetricUnitSuffix(unitKey, metricSymbol)
  if (!suffix || value === '' || value === '--' || value.endsWith(suffix)) return value
  return `${value}${suffix}`
}

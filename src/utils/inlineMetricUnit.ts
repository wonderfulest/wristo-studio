const INLINE_UNIT_SUFFIXES: Readonly<Record<string, string>> = Object.freeze({})

export function resolveInlineMetricUnitSuffix(unitKey: string): string | null {
  return INLINE_UNIT_SUFFIXES[unitKey] ?? null
}

export function formatInlineMetricUnit(unitKey: string, displayValue: string): string {
  const value = String(displayValue ?? '')
  const suffix = resolveInlineMetricUnitSuffix(unitKey)
  if (!suffix || value === '' || value === '--' || value.endsWith(suffix)) return value
  return `${value}${suffix}`
}

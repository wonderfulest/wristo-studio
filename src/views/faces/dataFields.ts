export interface SupportedDataField {
  symbol: string
  label: string
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function englishLabel(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  const labels = record(value)
  const candidate = labels.eng ?? labels.en ?? labels.long ?? labels.medium
  return candidate == null ? '' : englishLabel(candidate)
}

// dataOptions is the published application's field catalog, not Studio's global catalog.
export function supportedDataFields(configJson: unknown): SupportedDataField[] {
  let parsed = configJson
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed) } catch { return [] }
  }
  const config = record(parsed)
  const fields = new Map<string, SupportedDataField>()
  const add = (symbol: unknown, option: unknown) => {
    if (typeof symbol !== 'string' || !symbol.startsWith(':FIELD_TYPE_')) return
    const data = record(option)
    if (data.isActive === 0) return
    const label = englishLabel(data.label) || englishLabel(data.dataLabel)
      || englishLabel(data.settingsLabel)
      || symbol.slice(':FIELD_TYPE_'.length).toLowerCase().replace(/_/g, ' ').replace(/^./, char => char.toUpperCase())
    if (!fields.has(symbol)) fields.set(symbol, { symbol, label })
  }
  const options = record(config.dataOptions)
  for (const [symbol, option] of Object.entries(options)) add(symbol, option)
  for (const value of Object.values(record(config.properties))) {
    const property = record(value)
    if (property.type !== 'data') continue
    for (const symbol of Array.isArray(property.metricSymbols) ? property.metricSymbols : []) add(symbol, options[String(symbol)])
    for (const option of Array.isArray(property.options) ? property.options : []) {
      const data = record(option)
      add(data.metricSymbol ?? data.value, option)
    }
    add(property.value, options[String(property.value)])
  }
  return [...fields.values()]
}

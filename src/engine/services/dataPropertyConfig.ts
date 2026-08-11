import type { DataTypeOption } from '@/types/dataCatalog'
import type { DataOptionsMap, PropertiesMap, PropertyItem } from '@/types/properties'

export type DataPropertyIssueCode =
  | 'unknown_symbol'
  | 'invalid_value'
  | 'empty_options'
  | 'invalid_definition'

export interface DataPropertyIssue {
  code: DataPropertyIssueCode
  propertyKey: string
  metricSymbol?: string
  path: string
}

export interface NormalizedDataPropertyConfig {
  properties: PropertiesMap
  dataOptions: DataOptionsMap
  issues: DataPropertyIssue[]
}

type UnknownRecord = Record<string, any>

const isRecord = (value: unknown): value is UnknownRecord => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const orderedSymbols = (values: unknown): string[] => {
  if (!Array.isArray(values)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const symbol = typeof value === 'string' ? value.trim() : ''
    if (!symbol || seen.has(symbol)) continue
    seen.add(symbol)
    result.push(symbol)
  }
  return result
}

const mergeDefinition = (
  canonical: DataTypeOption | undefined,
  stored: UnknownRecord | undefined,
): DataTypeOption | undefined => {
  if (!canonical && !stored) return undefined
  return clone({ ...(canonical || {}), ...(stored || {}) }) as DataTypeOption
}

const catalogIndexes = (catalogOptions: readonly DataTypeOption[]) => ({
  bySymbol: new Map(catalogOptions.map((option) => [option.metricSymbol, option])),
  byValue: new Map(catalogOptions.map((option) => [option.valueCode, option])),
})

const legacySelectedSymbol = (
  value: unknown,
  legacyOptions: UnknownRecord[],
  byValue: Map<number, DataTypeOption>,
): string => {
  if (typeof value === 'string' && value.trim().startsWith(':')) return value.trim()
  const stored = legacyOptions.find((option) => option.value === value || option.valueCode === value)
  if (typeof stored?.metricSymbol === 'string') return stored.metricSymbol
  if (typeof value === 'number') return byValue.get(value)?.metricSymbol || ''
  return ''
}

export function normalizeDataPropertyConfig(
  config: unknown,
  catalogOptions: readonly DataTypeOption[],
): NormalizedDataPropertyConfig {
  const source = isRecord(config) ? config : {}
  const sourceProperties = isRecord(source.properties) ? source.properties : {}
  const sourceDataOptions = isRecord(source.dataOptions) ? source.dataOptions : {}
  const { bySymbol, byValue } = catalogIndexes(catalogOptions)
  const properties = clone(sourceProperties) as PropertiesMap
  const dataOptions: DataOptionsMap = {}
  const issues: DataPropertyIssue[] = []

  for (const [propertyKey, rawProperty] of Object.entries(sourceProperties)) {
    if (!isRecord(rawProperty) || rawProperty.type !== 'data') continue
    const legacyOptions = Array.isArray(rawProperty.options)
      ? rawProperty.options.filter(isRecord)
      : []
    const symbols = Object.prototype.hasOwnProperty.call(rawProperty, 'metricSymbols')
      ? orderedSymbols(rawProperty.metricSymbols)
      : orderedSymbols(legacyOptions.map((option) => option.metricSymbol))
    const property = clone(rawProperty) as UnknownRecord
    delete property.options
    property.metricSymbols = symbols

    if (symbols.length === 0) {
      issues.push({ code: 'empty_options', propertyKey, path: `properties.${propertyKey}.metricSymbols` })
    }

    for (const symbol of symbols) {
      const topLevel = isRecord(sourceDataOptions[symbol]) ? sourceDataOptions[symbol] : undefined
      const legacy = legacyOptions.find((option) => option.metricSymbol === symbol)
      const definition = mergeDefinition(bySymbol.get(symbol), topLevel || legacy)
      if (!definition || definition.metricSymbol !== symbol) {
        issues.push({
          code: 'unknown_symbol',
          propertyKey,
          metricSymbol: symbol,
          path: `properties.${propertyKey}.metricSymbols`,
        })
        continue
      }
      if (!dataOptions[symbol]) dataOptions[symbol] = definition
    }

    const selected = Object.prototype.hasOwnProperty.call(rawProperty, 'metricSymbols')
      ? (typeof rawProperty.value === 'string' ? rawProperty.value.trim() : '')
      : legacySelectedSymbol(rawProperty.value, legacyOptions, byValue)
    if (selected && symbols.includes(selected)) {
      property.value = selected
    } else {
      property.value = symbols[0] || ''
      issues.push({
        code: 'invalid_value',
        propertyKey,
        metricSymbol: selected || undefined,
        path: `properties.${propertyKey}.value`,
      })
    }
    properties[propertyKey] = property as PropertyItem
  }

  return { properties, dataOptions, issues }
}

export function serializeDataPropertyConfig(
  sourceProperties: PropertiesMap,
  sourceDataOptions: DataOptionsMap,
  catalogOptions: readonly DataTypeOption[],
): NormalizedDataPropertyConfig {
  const { bySymbol } = catalogIndexes(catalogOptions)
  const properties = clone(sourceProperties)
  const dataOptions: DataOptionsMap = {}
  const issues: DataPropertyIssue[] = []

  for (const [propertyKey, rawProperty] of Object.entries(properties)) {
    if (rawProperty.type !== 'data') continue
    const property = rawProperty as PropertyItem & UnknownRecord
    const symbols = orderedSymbols(property.metricSymbols)
    delete property.options
    property.metricSymbols = symbols

    if (symbols.length === 0) {
      issues.push({ code: 'empty_options', propertyKey, path: `properties.${propertyKey}.metricSymbols` })
    }
    if (typeof property.value !== 'string' || !symbols.includes(property.value)) {
      issues.push({
        code: 'invalid_value',
        propertyKey,
        metricSymbol: typeof property.value === 'string' ? property.value : undefined,
        path: `properties.${propertyKey}.value`,
      })
    }
    for (const symbol of symbols) {
      const definition = mergeDefinition(bySymbol.get(symbol), sourceDataOptions[symbol] as UnknownRecord | undefined)
      if (!definition || definition.metricSymbol !== symbol) {
        issues.push({
          code: 'unknown_symbol',
          propertyKey,
          metricSymbol: symbol,
          path: `properties.${propertyKey}.metricSymbols`,
        })
        continue
      }
      if (!dataOptions[symbol]) dataOptions[symbol] = definition
    }
  }

  return { properties, dataOptions, issues }
}

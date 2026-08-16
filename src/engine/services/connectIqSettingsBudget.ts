import type { AppLanguage } from '@/types/localization'
import type { DataOptionsMap, PropertiesMap, PropertyItem } from '@/types/properties'
import { getAllowedDateFormatters } from '@/domain/designLanguageCapabilities'

export const CONNECT_IQ_SETTINGS_BUDGET_BYTES = 20 * 1024
export const CONNECT_IQ_SETTINGS_WARNING_BYTES = Math.ceil(CONNECT_IQ_SETTINGS_BUDGET_BYTES * 0.8)

export type ConnectIqSettingsBudgetStatus = 'normal' | 'warning' | 'exceeded'

export type ConnectIqSettingsBudgetInput = {
  properties: PropertiesMap
  dataOptions?: DataOptionsMap
  elements: Array<Record<string, unknown>>
  appLanguage?: AppLanguage
  visualThemes?: { enabled?: boolean; themes?: unknown[] } | null
  textCase?: number
  dataNumberFormat?: number
  maxFieldLength?: number
  bitmapMode?: boolean
}

export type ConnectIqSettingsBudgetReport = {
  usedBytes: number
  limitBytes: number
  warningBytes: number
  remainingBytes: number
  percentage: number
  status: ConnectIqSettingsBudgetStatus
  fixedSettings: number
  customSettings: number
  dateSettings: number
  themeSettings: number
  totalSettings: number
  listOptions: number
}

const fixedSettings = (input: ConnectIqSettingsBudgetInput) => [
  { key: 'AppName', type: 'text', value: '' },
  { key: 'AppVersion', type: 'text', value: '' },
  { key: 'HourFormat', type: 'text', value: '' },
  { key: 'LeadingZeroForHours', type: 'boolean', value: true },
  { key: 'UnitsFormat', type: 'text', value: '' },
  { key: 'TextCase', type: 'list', value: input.textCase ?? 0, options: [0, 1, 2] },
  { key: 'DataNumberFormat', type: 'list', value: input.dataNumberFormat ?? 0, options: [0, 1, 2, 3] },
  { key: 'MaxFieldLength', type: 'number', value: input.maxFieldLength ?? 8 },
  { key: 'BitmapMode', type: 'boolean', value: input.bitmapMode ?? true },
]

const utf8Bytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).byteLength

const propertyOptions = (property: PropertyItem, dataOptions: DataOptionsMap): unknown[] => {
  if (Array.isArray(property.options)) return property.options
  if (property.type === 'data' && Array.isArray(property.metricSymbols)) {
    return property.metricSymbols.map((value) => {
      const option = dataOptions[value]
      return {
        label: option?.settingsLabel || option?.label || value,
        value: option?.valueCode ?? value,
      }
    })
  }
  return []
}

export function classifyConnectIqSettingsUsage(usedBytes: number): ConnectIqSettingsBudgetStatus {
  if (usedBytes > CONNECT_IQ_SETTINGS_BUDGET_BYTES) return 'exceeded'
  if (usedBytes >= CONNECT_IQ_SETTINGS_WARNING_BYTES) return 'warning'
  return 'normal'
}

export function calculateConnectIqSettingsBudget(input: ConnectIqSettingsBudgetInput): ConnectIqSettingsBudgetReport {
  const fixedEntries = fixedSettings(input)
  const appLanguage = input.appLanguage === 'zhs' ? 'zhs' : 'eng'
  const customEntries = Object.entries(input.properties || {}).map(([key, property]) => ({
    key,
    type: property.type,
    title: appLanguage === 'zhs' ? (property.titleCn || property.title) : property.title,
    value: property.value,
    options: propertyOptions(property, input.dataOptions || {}),
  }))
  const dateIds = new Map<string, { formatter: unknown; formatterOptions?: unknown[] }>()
  for (const element of input.elements || []) {
    if (String(element.type || element.eleType || '') !== 'date') continue
    const id = String(element.dateId ?? '')
    if (!id) continue
    dateIds.set(id, {
      formatter: element.formatter ?? 0,
      formatterOptions: Array.isArray(element.formatterOptions) ? element.formatterOptions : undefined,
    })
  }
  const allowedDateFormatters = [...getAllowedDateFormatters(appLanguage)]
  const dateEntries = [...dateIds.entries()].map(([id, date]) => ({
    key: `DateFormatter${id}`,
    type: 'list',
    value: date.formatter,
    options: date.formatterOptions?.filter(value => allowedDateFormatters.includes(Number(value)))
      ?? allowedDateFormatters,
  }))
  const themes = input.visualThemes?.enabled && Array.isArray(input.visualThemes.themes)
    ? input.visualThemes.themes
    : []
  const themeEntries = themes.length > 1
    ? [{ key: 'Theme', type: 'list', value: 0, options: themes.map((_, index) => index) }]
    : []
  const entries = [...fixedEntries, ...customEntries, ...dateEntries, ...themeEntries]
  const usedBytes = utf8Bytes(entries)
  const listOptions = entries.reduce((sum, entry) => sum + (Array.isArray(entry.options) ? entry.options.length : 0), 0)

  return {
    usedBytes,
    limitBytes: CONNECT_IQ_SETTINGS_BUDGET_BYTES,
    warningBytes: CONNECT_IQ_SETTINGS_WARNING_BYTES,
    remainingBytes: Math.max(0, CONNECT_IQ_SETTINGS_BUDGET_BYTES - usedBytes),
    percentage: Math.min(100, Math.round((usedBytes / CONNECT_IQ_SETTINGS_BUDGET_BYTES) * 100)),
    status: classifyConnectIqSettingsUsage(usedBytes),
    fixedSettings: fixedEntries.length,
    customSettings: customEntries.length,
    dateSettings: dateEntries.length,
    themeSettings: themeEntries.length,
    totalSettings: entries.length,
    listOptions,
  }
}

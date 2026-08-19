import { DateFormatOptions } from '@/config/elements/options/dateFormats'
import type { AppLanguage } from '@/types/localization'
import type { PropertiesMap, PropertyItem, PropertyOption } from '@/types/properties'

type DateElementRecord = Record<string, any>

export interface DatePropertyMigrationInput {
  properties?: PropertiesMap
  elements?: DateElementRecord[]
}

export interface ResolvedDatePropertyConfig {
  dateProperty?: string
  formatter: number
  formatterOptions: number[]
}

function numericValues(values: unknown): number[] {
  if (!Array.isArray(values)) return []
  const seen = new Set<number>()
  return values.reduce<number[]>((result, value) => {
    const numeric = Number(value)
    if (!Number.isInteger(numeric) || seen.has(numeric)) return result
    seen.add(numeric)
    result.push(numeric)
    return result
  }, [])
}

function propertyFormatterOptions(property: PropertyItem | undefined): number[] {
  return numericValues(property?.options?.map(option => option.value))
}

export function resolveDatePropertyConfig(
  element: DateElementRecord,
  properties: PropertiesMap,
): ResolvedDatePropertyConfig {
  const dateProperty = String(element.dateProperty ?? '').trim()
  const property = dateProperty && properties[dateProperty]?.type === 'date'
    ? properties[dateProperty]
    : undefined
  const fallbackFormatter = Number(element.formatter ?? 0)
  const propertyFormatter = Number(property?.value)
  const formatter = Number.isInteger(propertyFormatter) ? propertyFormatter : fallbackFormatter
  const propertyOptions = propertyFormatterOptions(property)
  const elementOptions = numericValues(element.formatterOptions)
  const formatterOptions = propertyOptions.length > 0 ? propertyOptions : elementOptions

  return {
    ...(property ? { dateProperty } : {}),
    formatter,
    formatterOptions: formatterOptions.includes(formatter)
      ? formatterOptions
      : [formatter, ...formatterOptions],
  }
}

function createDateOptions(values: number[], appLanguage: AppLanguage): PropertyOption[] {
  return values.map((value) => {
    const option = DateFormatOptions.find(candidate => candidate.value === value)
    return {
      label: option?.label || String(value),
      labelCn: option?.zhsLabel || option?.label || String(value),
      value,
    }
  }).map(option => appLanguage === 'zhs'
    ? { ...option, label: option.labelCn || option.label }
    : option)
}

function nextDatePropertyKey(properties: PropertiesMap, start: number): string {
  let index = start
  while (properties[`date_${index}`]) index += 1
  return `date_${index}`
}

export function migrateLegacyDateProperties(
  input: DatePropertyMigrationInput,
  appLanguage: AppLanguage,
): { properties: PropertiesMap; elements: DateElementRecord[] } {
  const properties: PropertiesMap = { ...(input.properties || {}) }
  let nextIndex = 1
  const elements = (input.elements || []).map((element) => {
    if (String(element.eleType ?? element.type ?? '') !== 'date') return element

    const existingKey = String(element.dateProperty ?? '').trim()
    if (existingKey && properties[existingKey]?.type === 'date') {
      return { ...element, ...resolveDatePropertyConfig(element, properties) }
    }

    const formatter = Number(element.formatter ?? 0)
    const formatterOptions = numericValues(element.formatterOptions)
    const values = formatterOptions.includes(formatter)
      ? formatterOptions
      : [formatter, ...formatterOptions]
    const key = nextDatePropertyKey(properties, nextIndex)
    nextIndex = Number(key.slice('date_'.length)) + 1
    const sequence = nextIndex - 1
    properties[key] = {
      type: 'date',
      title: `Date ${sequence}`,
      titleCn: `日期 ${sequence}`,
      value: formatter,
      options: createDateOptions(values, appLanguage),
    }
    return {
      ...element,
      dateProperty: key,
      formatter,
      formatterOptions: values,
    }
  })

  return { properties, elements }
}

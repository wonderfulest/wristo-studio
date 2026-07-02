import type { DataTypeOption } from '@/types/settings'
import { listDataTypeOptions, type DataTypeOptionVO } from '@/api/data-type-options'

export const DataTypeOptions: DataTypeOption[] = []

export let dataTypeOptionsLoaded = false
export let dataTypeOptionsLoadError: unknown = null

let loadPromise: Promise<DataTypeOption[]> | null = null

const readLocalizedLabel = (option: DataTypeOptionVO, lang: 'eng' | 'zhs') => {
  const value = option.labelI18n?.[lang] ?? option.labelI18n?.[lang === 'eng' ? 'en' : 'zh']
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (value && typeof value === 'object') {
    return value.short || value.medium || value.long || ''
  }
  return ''
}

const labelI18nEng = (option: DataTypeOptionVO) =>
  readLocalizedLabel(option, 'eng') || option.enLabel || option.label

const localizedLabel = (option: DataTypeOptionVO, lang: 'eng' | 'zhs') => {
  return readLocalizedLabel(option, lang) || labelI18nEng(option)
}

const sortOrder = (value: unknown) => {
  const order = Number(value)
  return Number.isFinite(order) ? order : Number.POSITIVE_INFINITY
}

const sortBySortOrder = (a: DataTypeOption, b: DataTypeOption) => {
  const diff = sortOrder(a.sortOrder) - sortOrder(b.sortOrder)
  if (diff !== 0) return diff
  return a.label.localeCompare(b.label)
}

const toDataTypeOption = (option: DataTypeOptionVO): DataTypeOption => {
  const label = localizedLabel(option, 'eng')
  const iconUnicode = option.iconUnicode || option.icon || ''
  return {
    labelCn: localizedLabel(option, 'zhs'),
    metricSymbol: option.metricSymbol,
    value: option.value ?? option.valueCode,
    defaultValue: option.defaultValue || '',
    icon: iconUnicode,
    iconUnicode,
    sortOrder: option.sortOrder,
    unit: option.unit || '',
    label,
    enLabel: label,
  }
}

export async function loadDataTypeOptions(force = false): Promise<DataTypeOption[]> {
  if (loadPromise && !force) return loadPromise
  loadPromise = listDataTypeOptions({ active: 1 })
    .then((res) => {
      const list = Array.isArray(res.data) ? res.data : []
      DataTypeOptions.splice(0, DataTypeOptions.length, ...list.map(toDataTypeOption).sort(sortBySortOrder))
      dataTypeOptionsLoaded = true
      dataTypeOptionsLoadError = null
      return DataTypeOptions
    })
    .catch((error) => {
      dataTypeOptionsLoaded = false
      dataTypeOptionsLoadError = error
      DataTypeOptions.splice(0, DataTypeOptions.length)
      throw error
    })
  return loadPromise
}

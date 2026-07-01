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

const toDataTypeOption = (option: DataTypeOptionVO): DataTypeOption => {
  const label = localizedLabel(option, 'eng')
  return {
    labelCn: localizedLabel(option, 'zhs'),
    metricSymbol: option.metricSymbol,
    value: option.value ?? option.valueCode,
    defaultValue: option.defaultValue || '',
    icon: option.icon || option.iconUnicode || '',
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
      DataTypeOptions.splice(0, DataTypeOptions.length, ...list.map(toDataTypeOption))
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

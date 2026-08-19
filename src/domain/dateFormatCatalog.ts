import type { AppLanguage } from '@/types/localization'
import type { DataTypeOption } from '@/types/dataCatalog'
import type { OptionFormat } from '@/types/settings'

export type CatalogDateFormatOption = OptionFormat<number> & {
  valueCode: number
  systemDefault: boolean
}

const categoryForLanguage = (appLanguage: AppLanguage) => appLanguage === 'zhs' ? 'date_cn' : 'date'

export function getCatalogDateFormatOptions(
  options: readonly DataTypeOption[],
  appLanguage: AppLanguage,
): CatalogDateFormatOption[] {
  const category = categoryForLanguage(appLanguage)
  return options
    .filter(option => option.category === category && option.formatterCode != null)
    .map(option => ({
      value: Number(option.formatterCode),
      valueCode: option.valueCode,
      label: option.settingsLabel.eng,
      zhsLabel: option.settingsLabel.zhs,
      example: option.defaultValue,
      systemDefault: option.systemDefault === 1,
    }))
}

export function getCatalogDateFormatterDefaults(
  options: readonly DataTypeOption[],
  appLanguage: AppLanguage,
): number[] {
  const dateOptions = getCatalogDateFormatOptions(options, appLanguage)
  const defaults = dateOptions.filter(option => option.systemDefault).map(option => option.value)
  return defaults.length > 0 ? defaults : dateOptions.slice(0, 1).map(option => option.value)
}

export function resolveCatalogDateFormatterValues(
  values: readonly unknown[] | null | undefined,
  options: readonly DataTypeOption[],
  appLanguage: AppLanguage,
): number[] {
  const available = getCatalogDateFormatOptions(options, appLanguage)
  const allowed = new Set(available.map(option => option.value))
  if (!Array.isArray(values)) return available.map(option => option.value)
  const resolved: number[] = []
  values.forEach(raw => {
    const value = Number(raw)
    if (Number.isInteger(value) && allowed.has(value) && !resolved.includes(value)) resolved.push(value)
  })
  return resolved.length > 0 ? resolved : getCatalogDateFormatterDefaults(options, appLanguage)
}

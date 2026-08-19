import type { DataTypeOption } from '@/types/dataCatalog'
import { getCatalogDateFormatterDefaults, resolveCatalogDateFormatterValues } from '@/domain/dateFormatCatalog'
import type { AppLanguage } from '@/types/localization'
import type { OptionFormat } from '@/types/settings'

export type DateOptionLengthBand = 'all' | 'short' | 'medium' | 'long'

export const getCommonDateFormatterValues = (appLanguage: AppLanguage, options: readonly DataTypeOption[] = []): number[] => (
  getCatalogDateFormatterDefaults(options, appLanguage)
)

export const resolveDateFormatterValues = (
  values: readonly unknown[] | null | undefined,
  appLanguage: AppLanguage,
  options: readonly DataTypeOption[] = [],
): number[] => {
  return resolveCatalogDateFormatterValues(values, options, appLanguage)
}

export const getDateOptionLengthBand = (
  option: Pick<OptionFormat<number>, 'example'>,
): Exclude<DateOptionLengthBand, 'all'> => {
  const length = [...String(option.example || '')].length
  if (length <= 3) return 'short'
  if (length <= 6) return 'medium'
  return 'long'
}

export const filterDateFormatOptions = (
  options: readonly OptionFormat<number>[],
  query: string,
  lengthBand: DateOptionLengthBand,
  _appLanguage: AppLanguage,
): OptionFormat<number>[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  return options.filter((option) => {
    if (lengthBand !== 'all' && getDateOptionLengthBand(option) !== lengthBand) return false
    if (!normalizedQuery) return true
    return [option.label, option.zhsLabel, option.example]
      .filter(Boolean)
      .some(value => String(value).toLocaleLowerCase().includes(normalizedQuery))
  })
}

export type AppLanguage = 'eng' | 'zhs'
export type DataLabelLength = 'short' | 'medium' | 'long'
export interface WatchfaceLocalizationConfig {
  appLanguage: AppLanguage
  dataLabelLength: DataLabelLength
}

export function normalizeAppLanguage(value: unknown): AppLanguage {
  if (value === 'zhs' || value === 'zh') return 'zhs'
  return 'eng'
}

export function normalizeDataLabelLength(value: unknown): DataLabelLength {
  return value === 'medium' || value === 'long' ? value : 'short'
}

export type WatchfaceLocale = 'en-US' | 'zh-CN'

export interface ElementLocalizationConfig {
  localizedText?: Partial<Record<WatchfaceLocale, string>>
  fallbackText?: string
}

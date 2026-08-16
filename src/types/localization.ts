export type AppLanguage = 'eng' | 'zhs'
export interface WatchfaceLocalizationConfig {
  appLanguage: AppLanguage
}

export function normalizeAppLanguage(value: unknown): AppLanguage {
  if (value === 'zhs' || value === 'zh') return 'zhs'
  return 'eng'
}

export type WatchfaceLocale = 'en-US' | 'zh-CN'

export interface ElementLocalizationConfig {
  localizedText?: Partial<Record<WatchfaceLocale, string>>
  fallbackText?: string
}

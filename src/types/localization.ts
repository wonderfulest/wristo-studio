export type AppLanguage = 'en' | 'zh'
export interface WatchfaceLocalizationConfig {
  appLanguage: AppLanguage
}

export function normalizeAppLanguage(value: unknown): AppLanguage {
  return value === 'zh' ? 'zh' : 'en'
}

export type WatchfaceLocale = 'en-US' | 'zh-CN'

export interface ElementLocalizationConfig {
  localizedText?: Partial<Record<WatchfaceLocale, string>>
  fallbackText?: string
}

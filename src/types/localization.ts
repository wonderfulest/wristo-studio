export type WatchfaceLocale = 'en-US' | 'zh-CN'
export interface WatchfaceLocalizationConfig {
  defaultLocale: WatchfaceLocale
  supportedLocales: WatchfaceLocale[]
}

export interface ElementLocalizationConfig {
  localizedText?: Partial<Record<WatchfaceLocale, string>>
  fallbackText?: string
}

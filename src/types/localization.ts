export type WatchfaceLocale = 'en-US' | 'zh-CN'
export type WatchfaceTextMode = 'bitmapFont'

export interface LocaleFontBinding {
  textMode: WatchfaceTextMode
  fontFamily?: string
}

export type FontRoleBindings = Partial<Record<WatchfaceLocale, LocaleFontBinding>>

export interface WatchfaceLocalizationConfig {
  defaultLocale: WatchfaceLocale
  supportedLocales: WatchfaceLocale[]
  fontRoles: Record<string, FontRoleBindings>
}

export interface ElementLocalizationConfig {
  fontRole?: string
  localizedText?: Partial<Record<WatchfaceLocale, string>>
  fallbackText?: string
}

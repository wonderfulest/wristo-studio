export type ThemeMode = 'theme' | 'user'

export type VisualThemeSelectionMode = 'user'

export type VisualThemeAssetSlot =
  | 'background'
  | 'hourHand'
  | 'minuteHand'
  | 'secondHand'
  | 'centerCap'

export interface VisualThemeAssetRef {
  assetId: number | null
  imageUrl: string | null
  targetSize?: number
}

export interface VisualTheme {
  id: string
  name: string
  assets: Partial<Record<VisualThemeAssetSlot, VisualThemeAssetRef>>
  colors?: Record<string, string>
}

export interface VisualThemesConfig {
  version: 1
  enabled: boolean
  defaultThemeId: string
  selectionMode: VisualThemeSelectionMode
  themes: VisualTheme[]
}

import type { DataOptionsMap, PropertiesMap } from '@/types/properties'
import type { AnyElementConfig } from '@/types/elements'
import type { WatchfaceLocalizationConfig } from '@/types/localization'
import type { VisualThemesConfig } from '@/types/visualTheme'
import type { HorizontalLayoutGroupConfig } from '@/types/layoutGroup'

export interface RuntimeDesignConfig {
  version: string
  properties: PropertiesMap
  dataOptions?: DataOptionsMap
  designId: string
  name: string
  textCase: number
  bitmapMode: boolean
  dataNumberFormat?: number
  maxFieldLength?: number
  localization?: WatchfaceLocalizationConfig
  visualThemes?: VisualThemesConfig
  layoutGroups?: HorizontalLayoutGroupConfig[]
  connectIqSettingsExcludedDataTypeValues?: number[]
  elements: AnyElementConfig[]
  orderIds: string[]
  currentIconFontSlug?: string
  currentIconFontSize?: number
}

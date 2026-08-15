import type { DataOptionsMap, PropertiesMap } from '@/types/properties'
import type { AnyElementConfig } from '@/types/elements'
import type { WatchfaceLocalizationConfig } from '@/types/localization'
import type { VisualThemesConfig } from '@/types/visualTheme'

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
  connectIqSettingsExcludedDataTypeValues?: number[]
  elements: AnyElementConfig[]
  orderIds: string[]
}

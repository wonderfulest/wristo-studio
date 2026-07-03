import type { PropertiesMap } from '@/types/properties'
import type { AnyElementConfig } from '@/types/elements'
import type { WatchfaceLocalizationConfig } from '@/types/localization'

export interface RuntimeDesignConfig {
  version: string
  properties: PropertiesMap
  designId: string
  name: string
  textCase: number
  bitmapMode: boolean
  supportsChineseContent?: boolean
  localization?: WatchfaceLocalizationConfig
  elements: AnyElementConfig[]
  orderIds: string[]
}

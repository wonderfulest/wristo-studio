import type { PropertiesMap } from '@/types/properties'
import type { AnyElementConfig } from '@/types/elements'

export interface RuntimeDesignConfig {
  version: string
  properties: PropertiesMap
  designId: string
  name: string
  textCase: number
  labelLengthType: number
  showUnit: boolean
  elements: AnyElementConfig[]
  orderIds: string[]
  themeBackgroundImages: unknown[]
}

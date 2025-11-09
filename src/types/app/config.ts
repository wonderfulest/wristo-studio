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
  currentIconFontSlug: string // 当前图标字体(适用于icon、indicator元素)
  currentIconFontSize: number // 当前图标字体大小(适用于icon、indicator元素)
}

import type { BaseElementConfig } from './base'
import type { ElementLocalizationConfig, WatchfaceLocale } from '@/types/localization'
import type { GarminSystemFontSelection } from '@/types/garminSystemFont'

export interface TextElementConfig extends BaseElementConfig, GarminSystemFontSelection {
  fontFamily: string
  fontRole?: string
  fontSize: number
  fill: string
  topBase?: number
  // 模板文本内容，用于导出/导入
  textTemplate?: string
  localizedText?: Partial<Record<WatchfaceLocale, string>>
  localization?: ElementLocalizationConfig
  // 绑定的字符串属性 key，用于从 App Properties 获取文本
  textProperty?: string
  angle?: number
  radius?: number
  direction?: string
  justification?: string | number
  scrollAreaWidth?: number
  scrollAreaLeft?: number
  scrollAreaTop?: number
  scrollAreaBackground?: string
}

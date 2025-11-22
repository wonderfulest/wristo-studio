import type { BaseElementConfig } from './base'

export interface TextElementConfig extends BaseElementConfig {
  fontFamily: string
  fontSize: number
  // 模板文本内容，用于导出/导入
  textTemplate?: string
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

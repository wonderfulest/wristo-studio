import type { TextElementConfig } from './text'

export interface TimeElementConfig extends TextElementConfig {
  eleType: 'time'
  formatter: number
  // 字体渲染类型：truetype / bitmap
  fontRenderType?: 'truetype' | 'bitmap'
  // bitmap 字体 ID，仅在 fontRenderType === 'bitmap' 时使用
  bitmapFontId?: number | null
  // bitmap 字体字符间距（像素），仅在 fontRenderType === 'bitmap' 时使用
  fontGap?: number
  // 仅用于导出：文字 baseline 的纵坐标
  topBase: number
}

export interface DateElementConfig extends TextElementConfig {
  eleType: 'date'
  formatter: number
  // 仅用于导出：文字 baseline 的纵坐标
  topBase: number
}

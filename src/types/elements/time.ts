import type { TextElementConfig } from './text'

export interface TimeElementConfig extends TextElementConfig {
  eleType: 'time'
  formatter: number
  // 仅用于导出：文字 baseline 的纵坐标
  topBase?: number
}

export interface DateElementConfig extends TextElementConfig {
  eleType: 'date'
  formatter: number
}

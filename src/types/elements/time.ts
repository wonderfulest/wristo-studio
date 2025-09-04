import type { TextElementConfig } from './text'

export interface TimeElementConfig extends TextElementConfig {
  eleType: 'time'
  formatter: number
}

export interface DateElementConfig extends TextElementConfig {
  eleType: 'date'
  formatter: number
}

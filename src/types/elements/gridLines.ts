import type { BaseElementConfig } from './base'

export interface GridLinesElementConfig extends BaseElementConfig {
  eleType: 'gridLines'
  width: number
  height: number
  spacing: number
  lineWidth: number
  color: string
  colorProperty?: string | null
  rotation: number
}

import type { BaseElementConfig } from './base'

// Battery config; many properties are optional and have sensible defaults in the store
export interface BatteryElementConfig extends BaseElementConfig {
  eleType: 'battery'
  width?: number
  height?: number
  color?: string
  level?: number
  headWidth?: number
  headHeight?: number
  padding?: number
  headGap?: number
  bodyStrokeWidth?: number
  bodyStroke?: string
  bodyStrokeProperty?: string | null
  bodyFill?: string
  bodyFillProperty?: string | null
  bodyRx?: number
  bodyRy?: number
  headFill?: string
  headFillProperty?: string | null
  headRx?: number
  headRy?: number
  levelColorLow?: string | null
  levelColorLowProperty?: string | null
  levelColorMedium?: string | null
  levelColorMediumProperty?: string | null
  levelColorHigh?: string | null
  levelColorHighProperty?: string | null
}

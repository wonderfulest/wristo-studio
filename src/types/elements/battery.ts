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
  bodyFill?: string
  bodyRx?: number
  bodyRy?: number
  headFill?: string
  headRx?: number
  headRy?: number
  levelColorLow?: string | null
  levelColorMedium?: string | null
  levelColorHigh?: string | null
}

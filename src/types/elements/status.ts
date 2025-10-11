// Types for status elements
import type { BaseElementConfig } from './base'

export interface BatteryElementConfig extends BaseElementConfig {
  width: number
  height: number
  headWidth?: number
  headHeight?: number
  padding?: number
  level?: number
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

export interface MoveBarElementConfig extends BaseElementConfig {
  width?: number
  height?: number
  separator?: number
  level?: number
  activeColor?: string
  inactiveColor?: string
  color?: string
  bgColor?: string
}

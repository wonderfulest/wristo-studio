// Types for status elements
export interface BatteryElementConfig {
  left?: number
  top?: number
  width?: number
  height?: number
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
  levelColors?: {
    low: string
    medium: string
    high: string
  } | null
}

export interface MoveBarElementConfig {
  left?: number
  top?: number
  width?: number
  height?: number
  separator?: number
  level?: number
  activeColor?: string
  inactiveColor?: string
  color?: string
  bgColor?: string
}

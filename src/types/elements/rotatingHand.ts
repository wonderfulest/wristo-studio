import type { BaseElementConfig } from './base'

export type RotatingHandDialMode = 'goal' | 'range' | 'direction'
export type RotatingHandProgressMode = RotatingHandDialMode
export type RotatingHandOutOfRangeBehavior = 'clamp' | 'hide'

export interface RotatingHandElementConfig extends BaseElementConfig {
  eleType: 'rotatingHand'
  dialProperty: string
  progressMode: RotatingHandProgressMode
  previewProgress: number
  previewBearing?: number
  northAngle?: number
  startAngle: number
  endAngle: number
  counterClockwise: boolean
  outOfRangeBehavior: RotatingHandOutOfRangeBehavior
  assetId: number | null
  imageUrl: string | null
  centerX: number
  centerY: number
  pivotOffsetX: number
  pivotOffsetY: number
  scalePercent: number
}

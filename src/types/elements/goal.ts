import { TOriginX, TOriginY } from 'fabric'
import type { BaseElementConfig } from './base'
import type { GoalBarProgressDirection } from '@/elements/goal/goalBar/goalBar.direction'

export interface GoalElementConfig extends BaseElementConfig {
  eleType: 'goalBar' | 'goalArc'
  color: string
  bgColor: string
  progress: number
}

export interface GoalArcElementConfig extends GoalElementConfig {
  eleType: 'goalArc'
  startAngle: number
  endAngle: number
  radius: number
  bgRadius: number
  strokeWidth: number
  bgStrokeWidth: number
  color: string
  bgColor: string
  counterClockwise: boolean
  goalProperty: string
  progress: number
  segmentMode?: boolean
  segments?: number
  gapAngle?: number
  endCap?: 'round' | 'butt'
  gradientEnabled?: boolean
  gradientStartColor?: string
  gradientEndColor?: string
}

export interface GoalBarElementConfig extends GoalElementConfig {
  eleType: 'goalBar'
  left: number
  top: number
  width: number
  height: number
  color: string
  bgColor: string
  variant?: 'continuous' | 'segmented'
  segments?: number
  gap?: number
  borderRadius: number
  progress: number
  padding: number
  originX: TOriginX 
  originY: TOriginY
  borderWidth: number
  borderColor: string
  goalProperty: string
  progressDirection: GoalBarProgressDirection
  shape?: 'rectangle' | 'customPolygon'
  polygonPoints?: Array<{ x: number; y: number }>
  gradientEnabled?: boolean
  gradientStartColor?: string
  gradientEndColor?: string
}

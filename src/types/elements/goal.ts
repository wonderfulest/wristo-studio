import { TOriginX, TOriginY } from 'fabric'
import type { BaseElementConfig } from './base'

export interface GoalElementConfig extends BaseElementConfig {
  eleType: 'goalBar' | 'goalArc' | 'goalSegmentBar'
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
}

export interface GoalBarElementConfig extends GoalElementConfig {
  eleType: 'goalBar'
  left: number
  top: number
  width: number
  height: number
  color: string
  bgColor: string
  borderRadius: number
  progress: number
  padding: number
  originX: TOriginX 
  originY: TOriginY
  borderWidth: number
  borderColor: string
  goalProperty: string
  progressAlign: 'left' | 'right'
}

export interface GoalSegmentBarElementConfig extends GoalElementConfig {
  eleType: 'goalSegmentBar'
  left: number
  top: number
  width: number
  height: number
  color: string       // active segment color
  bgColor: string     // inactive segment color
  borderRadius: number
  segments: number    // number of segments
  gap: number         // gap between segments (px)
  progress: number    // 0..1
  originX: TOriginX
  originY: TOriginY
  goalProperty: string
}

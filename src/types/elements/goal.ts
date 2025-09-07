import { TOriginX, TOriginY } from 'fabric'
import type { BaseElementConfig } from './base'

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

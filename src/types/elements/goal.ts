// Types for goal elements
export interface GoalArcElementConfig {
  left?: number
  top?: number
  startAngle: number
  endAngle: number
  radius: number
  bgRadius?: number
  strokeWidth: number
  bgStrokeWidth?: number
  color: string
  bgColor: string
  counterClockwise?: boolean
  goalProperty?: string
  progress?: number
}

export interface GoalBarElementConfig {
  left?: number
  top?: number
  width?: number
  height?: number
  color?: string
  bgColor?: string
  borderRadius?: number
  progress?: number
  padding?: number
  originX?: 'left' | 'center' | 'right'
  originY?: 'top' | 'center' | 'bottom'
  borderWidth?: number
  borderColor?: string
  goalProperty?: string
  progressAlign?: 'left' | 'right'
}

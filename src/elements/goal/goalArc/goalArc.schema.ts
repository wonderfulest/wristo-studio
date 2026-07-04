import type { ElementType } from '@/types/element'

export type GoalArcElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
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
    segmentMode: boolean
    segments: number
    gapAngle: number
    endCap: 'round' | 'butt'
  }
  resizable: boolean
  rotatable: boolean
}

export const goalArcSchema: GoalArcElementSchema = {
  type: 'goalArc' as ElementType,
  name: 'Goal Arc',
  icon: 'mdi:chart-arc',
  defaultConfig: {
    startAngle: 0,
    endAngle: 359,
    radius: 50,
    bgRadius: 50,
    strokeWidth: 2,
    bgStrokeWidth: 2,
    color: '#FFFFFF',
    bgColor: '#555555',
    counterClockwise: false,
    goalProperty: '',
    progress: 0,
    segmentMode: false,
    segments: 12,
    gapAngle: 2,
    endCap: 'butt',
  },
  resizable: false,
  rotatable: false,
}

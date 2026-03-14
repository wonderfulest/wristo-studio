import type { ElementType } from '@/types/element'

export type GoalSegmentBarElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    width: number
    height: number
    color: string
    bgColor: string
    borderRadius: number
    segments: number
    gap: number
    progress: number
    originX: 'center'
    originY: 'center'
    goalProperty: string
  }
  resizable: boolean
  rotatable: boolean
}

export const goalSegmentBarSchema: GoalSegmentBarElementSchema = {
  type: 'goalSegmentBar' as ElementType,
  name: 'Segment Bar',
  icon: 'iconfont icon-goal-bar-segment',
  defaultConfig: {
    width: 200,
    height: 5,
    color: '#00FF00',
    bgColor: '#333333',
    borderRadius: 2,
    segments: 10,
    gap: 2,
    progress: 0.667,
    originX: 'center',
    originY: 'center',
    goalProperty: '',
  },
  resizable: false,
  rotatable: false,
}

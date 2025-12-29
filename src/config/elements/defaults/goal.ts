import type { GoalElementConfig, GoalArcElementConfig } from '@/types/elements'
import { DEFAULT_BASE_CONFIG, EDITOR_ELEMENT } from './base'

export const DEFAULT_GOAL_CONFIG: GoalElementConfig & EDITOR_ELEMENT = Object.assign(
  {}, DEFAULT_BASE_CONFIG,{
  icon: 'mdi:bullseye-arrow',
  label: 'Goal',
  eleType: 'goalBar' as const,
  color: '#FFFFFF',
  bgColor: '#555555',
  progress: 0,
})

export const DEFAULT_GOALBAR_CONFIG: GoalElementConfig & EDITOR_ELEMENT = Object.assign(
  {}, DEFAULT_GOAL_CONFIG,{
  icon: 'iconfont icon-goalbar',
  label: 'Goal Bar',
  eleType: 'goalBar' as const,
})

export const DEFAULT_GOALARC_CONFIG: GoalArcElementConfig & EDITOR_ELEMENT = Object.assign(
  {}, DEFAULT_GOAL_CONFIG,{
  icon: 'mdi:chart-arc',
  label: 'Goal Arc',
  eleType: 'goalArc' as const,
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
})

export const DEFAULT_GOALSEGMENTBAR_CONFIG = Object.assign(
  {}, DEFAULT_GOAL_CONFIG, {
    icon: 'iconfont icon-goal-bar-segment',
    label: 'Segment Bar',
    eleType: 'goalSegmentBar' as const,
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
  }
)

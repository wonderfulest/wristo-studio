import type { ElementType } from '@/types/element'

export type GoalBarElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    width: number
    height: number
    color: string
    bgColor: string
    borderRadius: number
    progress: number
    padding: number
    borderWidth: number
    borderColor: string
    progressAlign: 'left' | 'right'
  }
  resizable: boolean
  rotatable: boolean
}

export const goalBarSchema: GoalBarElementSchema = {
  type: 'goalBar' as ElementType,
  name: 'Goal Bar',
  icon: 'mdi:progress-check',
  defaultConfig: {
    width: 200,
    height: 10,
    color: '#00FF00',
    bgColor: '#333333',
    borderRadius: 5,
    progress: 0.5,
    padding: 2,
    borderWidth: 0,
    borderColor: '#FFFFFF',
    progressAlign: 'left',
  },
  resizable: false,
  rotatable: false,
}

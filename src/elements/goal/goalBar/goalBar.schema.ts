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
    variant: 'continuous' | 'segmented'
    segments: number
    gap: number
    borderRadius: number
    progress: number
    padding: number
    borderWidth: number
    borderColor: string
    progressAlign: 'left' | 'right'
    shape: 'rectangle' | 'customPolygon'
    polygonPoints: Array<{ x: number; y: number }>
    gradientEnabled: boolean
    gradientStartColor: string
    gradientEndColor: string
  }
  resizable: boolean
  rotatable: boolean
}

export const goalBarSchema: GoalBarElementSchema = {
  type: 'goalBar' as ElementType,
  name: 'Goal Bar',
  icon: 'mdi:chart-bar',
  defaultConfig: {
    width: 200,
    height: 10,
    color: '#00FF00',
    bgColor: '#333333',
    variant: 'continuous',
    segments: 10,
    gap: 2,
    borderRadius: 5,
    progress: 0.5,
    padding: 2,
    borderWidth: 0,
    borderColor: '#FFFFFF',
    progressAlign: 'left',
    shape: 'rectangle',
    polygonPoints: [],
    gradientEnabled: false,
    gradientStartColor: '#00FF00',
    gradientEndColor: '#00FF00'
  },
  resizable: false,
  rotatable: false
}

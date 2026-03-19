import type { ElementType } from '@/types/element'

export type WindDirectionElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    width: number
    height: number
    windDegree: number
    color: string
  }
  resizable: boolean
  rotatable: boolean
  disabled: boolean
}

export const windDirectionSchema: WindDirectionElementSchema = {
  type: 'windDirection',
  name: 'Wind',
  icon: 'mdi:compass-outline',
  defaultConfig: {
    width: 30,
    height: 30,
    windDegree: 0,
    color: '#FFFFFF',
  },
  resizable: true,
  rotatable: true,
  disabled: true,
}

import type { ElementType } from '@/types/element'

export type DisturbElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    fontSize: number
    fontFamily: string
    fill: string
  }
  resizable: boolean
  rotatable: boolean
}

export const disturbSchema: DisturbElementSchema = {
  type: 'disturb',
  name: 'Disturb',
  icon: 'mdi:do-not-disturb',
  defaultConfig: {
    fontSize: 24,
    fontFamily: 'wristo-icon',
    fill: '#ffffff',
  },
  resizable: false,
  rotatable: false,
}

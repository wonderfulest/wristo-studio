import type { ElementType } from '@/types/element'

export type AlarmsElementSchema = {
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

export const alarmsSchema: AlarmsElementSchema = {
  type: 'alarms',
  name: 'Alarms',
  icon: 'mdi:alarm',
  defaultConfig: {
    fontSize: 24,
    fontFamily: 'wristo-icon',
    fill: '#ffffff',
  },
  resizable: false,
  rotatable: false,
}

import type { ElementType } from '@/types/element'

export type MoveBarElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    width: number
    height: number
    separator: number
    level: number
    activeColor: string
    inactiveColor: string
  }
  resizable: boolean
  rotatable: boolean
  disabled: boolean
}

export const moveBarSchema: MoveBarElementSchema = {
  type: 'moveBar',
  name: 'Move Bar',
  icon: 'mdi:run-fast',
  defaultConfig: {
    width: 150,
    height: 6,
    separator: 2,
    level: 3,
    activeColor: '#00FF00',
    inactiveColor: '#555555',
  },
  resizable: true,
  rotatable: false,
  disabled: true
}

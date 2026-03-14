import type { ElementType } from '@/types/element'

export type Tick12ElementSchema = {
  type: ElementType
  name: string
  icon: string
  resizable: boolean
  rotatable: boolean
}

export const tick12Schema: Tick12ElementSchema = {
  type: 'tick12',
  name: 'Tick 12',
  icon: 'hash',
  resizable: false,
  rotatable: false,
}

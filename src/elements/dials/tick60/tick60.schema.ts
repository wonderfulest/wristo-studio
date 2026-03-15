import type { ElementType } from '@/types/element'

export type Tick60ElementSchema = {
  type: ElementType
  name: string
  icon: string
  resizable: boolean
  rotatable: boolean
}

export const tick60Schema: Tick60ElementSchema = {
  type: 'tick60',
  name: 'Tick 60',
  icon: 'mdi:circle-slice-6',
  resizable: false,
  rotatable: false,
}

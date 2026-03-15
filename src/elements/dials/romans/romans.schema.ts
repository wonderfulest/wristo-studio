import type { ElementType } from '@/types/element'

export type RomansElementSchema = {
  type: ElementType
  name: string
  icon: string
  resizable: boolean
  rotatable: boolean
}

export const romansSchema: RomansElementSchema = {
  type: 'romans',
  name: 'Romans',
  icon: 'mdi:format-letter-case',
  resizable: false,
  rotatable: false,
}


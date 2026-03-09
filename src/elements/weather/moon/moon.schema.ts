import type { ElementType } from '@/types/element'

export type MoonElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    width: number
    height: number
    imageUrl: string | null
  }
  resizable: boolean
  rotatable: boolean
}

export const moonSchema: MoonElementSchema = {
  type: 'moon',
  name: 'Moon',
  icon: 'moon',
  defaultConfig: {
    width: 42,
    height: 42,
    imageUrl: null,
  },
  resizable: true,
  rotatable: false,
}

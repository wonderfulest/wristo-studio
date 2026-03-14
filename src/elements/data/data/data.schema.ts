import type { ElementType } from '@/types/element'

// Data 元素的基础描述 Schema
export type DataElementSchema = {
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

export const dataSchema: DataElementSchema = {
  type: 'data',
  name: 'Data',
  icon: 'mdi:database-outline',
  defaultConfig: {
    fontSize: 36,
    fontFamily: 'roboto-condensed-regular',
    fill: '#ffffff',
  },
  resizable: false,
  rotatable: false,
}

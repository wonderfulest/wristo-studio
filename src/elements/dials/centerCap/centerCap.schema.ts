import type { ElementType } from '@/types/element'

export type CenterCapElementSchema = {
  type: ElementType
  name: string
  icon: string
  defaultConfig: {
    imageUrl: string | null
    assetId: number | null
  }
  resizable: boolean
  rotatable: boolean
}

export const centerCapSchema: CenterCapElementSchema = {
  type: 'centerCap' as ElementType,
  name: 'Center Cap',
  icon: 'hash',
  defaultConfig: {
    imageUrl: null,
    assetId: null,
  },
  resizable: false,
  rotatable: false,
}

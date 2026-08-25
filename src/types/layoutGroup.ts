export const HORIZONTAL_LAYOUT_ELEMENT_TYPES = [
  'icon',
  'data',
  'unit',
  'label',
  'text',
  'time',
  'date',
  'image',
  'dynamicImage',
  'weather',
] as const

export type HorizontalLayoutElementType = (typeof HORIZONTAL_LAYOUT_ELEMENT_TYPES)[number]
export type HorizontalLayoutOriginX = 'left' | 'center' | 'right'

export interface HorizontalLayoutMemberConfig {
  elementId: string
  gapBefore: number
  offsetY: number
}

export interface LayoutGroupBinding {
  kind: 'data' | 'goal'
  propertyKey: string
}

export interface HorizontalLayoutGroupConfig {
  id: string
  name: string
  direction: 'horizontal'
  left: number
  top: number
  originX: HorizontalLayoutOriginX
  binding?: LayoutGroupBinding
  members: HorizontalLayoutMemberConfig[]
}

export const isHorizontalLayoutElementType = (value: unknown): value is HorizontalLayoutElementType =>
  HORIZONTAL_LAYOUT_ELEMENT_TYPES.includes(String(value) as HorizontalLayoutElementType)

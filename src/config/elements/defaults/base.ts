import type { BaseElementConfig, TextElementConfig, ShapeElementConfig, HandElementConfig } from '@/types/elements'

export const DEFAULT_LEFT: number = 227
export const DEFAULT_TOP: number = 227
export const DEFAULT_ORIGIN_X = 'center' as const
export const DEFAULT_ORIGIN_Y = 'center' as const
export const DEFAULT_FILL: string = '#FFFFFF'
export const DEFAULT_FONT_FAMILY: string = 'roboto-condensed-regular'
export const DEFAULT_FONT_SIZE: number = 36
export const DEFAULT_HAND_HEIGHT: number = 180
export const DEFAULT_HAND_MOVE_DY: number = 0

export interface EDITOR_ELEMENT {
  icon: string
  label: string
  eleType: string
  
  disabled?: boolean;
}

export const DEFAULT_BASE_CONFIG: BaseElementConfig = {
  id: '',
  eleType: '',
  left: DEFAULT_LEFT,
  top: DEFAULT_TOP,
  originX: DEFAULT_ORIGIN_X,
  originY: DEFAULT_ORIGIN_Y,
  fill: DEFAULT_FILL,
}

export const DEFAULT_TEXT_CONFIG: TextElementConfig = {
  id: '',
  eleType: '',
  left: DEFAULT_LEFT,
  top: DEFAULT_TOP,
  originX: DEFAULT_ORIGIN_X,
  originY: DEFAULT_ORIGIN_Y,
  fill: DEFAULT_FILL,
  fontFamily: DEFAULT_FONT_FAMILY,
  fontSize: 18,
}

export const DEFAULT_SHAPE_CONFIG: ShapeElementConfig = {
  id: '',
  eleType: 'circle',
  left: DEFAULT_LEFT,
  top: DEFAULT_TOP,
  originX: DEFAULT_ORIGIN_X,
  originY: DEFAULT_ORIGIN_Y,
  fill: DEFAULT_FILL,
  stroke: '#000000',
  strokeWidth: 0,
}

export const DEFAULT_HAND_CONFIG: HandElementConfig & EDITOR_ELEMENT = Object.assign({
  icon: '',
  label: '',
  eleType: 'hourHand',
  imageUrl: '',
  rotationCenter: { x: DEFAULT_LEFT, y: DEFAULT_TOP },
  targetHeight: DEFAULT_HAND_HEIGHT,
  moveDy: DEFAULT_HAND_MOVE_DY,
  angle: 0,
  height: DEFAULT_HAND_HEIGHT,
}, DEFAULT_BASE_CONFIG)

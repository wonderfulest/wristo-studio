import type { VisualThemeAssetSlot } from '@/types/visualTheme'

export const VISUAL_THEME_ASSET_ELEMENT_TYPES: Record<VisualThemeAssetSlot, string> = {
  background: 'background',
  hourHand: 'hourHand',
  minuteHand: 'minuteHand',
  secondHand: 'secondHand',
  centerCap: 'centerCap',
}

export const VISUAL_THEME_COLOR_BINDINGS = [
  ['color', 'colorProperty'],
  ['bgColor', 'bgColorProperty'],
  ['stroke', 'strokeProperty'],
  ['borderColor', 'borderColorProperty'],
  ['bodyStroke', 'bodyStrokeProperty'],
  ['headFill', 'headFillProperty'],
  ['bodyFill', 'bodyFillProperty'],
  ['fill', 'fillProperty'],
  ['activeColor', 'activeColorProperty'],
  ['inactiveColor', 'inactiveColorProperty'],
  ['pointColor', 'pointColorProperty'],
  ['gridColor', 'gridColorProperty'],
  ['xAxisColor', 'xAxisColorProperty'],
  ['yAxisColor', 'yAxisColorProperty'],
  ['xLabelColor', 'xLabelColorProperty'],
  ['yLabelColor', 'yLabelColorProperty'],
  ['levelColorHigh', 'levelColorHighProperty'],
  ['levelColorMedium', 'levelColorMediumProperty'],
  ['levelColorLow', 'levelColorLowProperty'],
] as const

export const VISUAL_THEME_ASSET_BASE_FIELDS: Partial<Record<VisualThemeAssetSlot, readonly string[]>> = {
  background: ['imageUrl', 'imageId', 'assetId'],
  hourHand: ['imageUrl', 'assetId'],
  minuteHand: ['imageUrl', 'assetId'],
  secondHand: ['imageUrl', 'assetId'],
  centerCap: ['imageUrl', 'assetId', 'targetSize'],
}

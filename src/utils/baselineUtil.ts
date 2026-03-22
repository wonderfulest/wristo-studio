import type { FabricElement } from '@/types/element'
import { Text } from 'fabric'

const FONT_SIZE_MULT =
  (Text as any).prototype._fontSizeMult ?? 1.13
const FONT_SIZE_FRACTION =
  (Text as any).prototype._fontSizeFraction ?? 0.222

export function encodeTopBaseForElement(
  element: FabricElement,
  _defaultFontFamily = 'roboto-condensed-regular',
): number {
  const top = (element.top ?? 0) as number
  const fontSize = (element.fontSize || 14) as number
  const scaleY = (element.scaleY ?? 1) as number

  // element.top 是 originY='center' 的中心点时：
  return top + scaleY * fontSize * FONT_SIZE_MULT * (0.5 - FONT_SIZE_FRACTION)
}

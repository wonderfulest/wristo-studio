import type { FabricElement } from '@/types/element'
import { fabricBaselineOffset } from '@/utils/fontVerticalMetrics'

export function encodeTopBaseForElement(
  element: FabricElement,
  _defaultFontFamily = 'roboto-condensed-regular',
): number {
  const top = (element.top ?? 0) as number
  const fontSize = (element.fontSize || 14) as number
  const scaleY = (element.scaleY ?? 1) as number

  // element.top 是 originY='center' 的中心点时：
  return top + scaleY * fabricBaselineOffset(fontSize)
}

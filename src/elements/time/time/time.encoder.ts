import type { TimeElementConfig } from '@/types/elements'
import type { FabricElement } from '@/types/element'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'
import { TimeFormatConstants } from '@/config/elements/options/timeFormats'
import { getSavedFontFamily, getSavedFontSize } from '@/utils/systemFontElement'
import { savedTextStyle } from '@/features/bitmap-font-maker/recipePreview'

export function encodeTime(element: FabricElement): TimeElementConfig {
  const formatter = Number((element as any).formatter ?? 0)
  const requiresTrueType = formatter === TimeFormatConstants.HOUR_FORMAT
  const config: TimeElementConfig = {
    id: String(element.id ?? ''),
    eleType: 'time',
    left: element.left,
    top: element.top,
    originX: element.originX,
    originY: element.originY,
    fontFamily: getSavedFontFamily(element, 'roboto-condensed-regular'),
    fontSize: getSavedFontSize(element, 14),
    fill: savedTextStyle(element).fill as string,
    formatter,
    fontRenderType: requiresTrueType
      ? 'truetype'
      : ((element as any).fontRenderType ?? 'truetype'),
    bitmapFontId: (element as any).bitmapFontId ?? null,
    fontGap: (element as any).fontGap,
    topBase: encodeTopBaseForElement(element),
  }
  return config as TimeElementConfig
}

export function decodeTime(config: TimeElementConfig): Partial<FabricElement> {
  const elementConfig: Partial<FabricElement> = {
    id: config.id,
    eleType: 'time',
    left: config.left,
    top: config.top,
    fontSize: config.fontSize,
    fontFamily: config.fontFamily,
    fill: config.fill,
    originX: config.originX,
    originY: config.originY,
    formatter: config.formatter,
    fontRenderType: config.fontRenderType ?? 'truetype',
    bitmapFontId: config.bitmapFontId ?? null,
    fontGap: config.fontGap,
  }
  return elementConfig as Partial<FabricElement>
}

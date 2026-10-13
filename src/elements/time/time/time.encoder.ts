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
    fontGap: (element as any).fontGap,
    topBase: encodeTopBaseForElement(element),
  }
  if (config.fontRenderType === 'bitmap') {
    config.bitmapFontId = (element as any).bitmapFontId ?? null
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
    fontGap: config.fontGap,
  }
  if (elementConfig.fontRenderType === 'bitmap') {
    elementConfig.bitmapFontId = config.bitmapFontId ?? null
  }
  return elementConfig as Partial<FabricElement>
}

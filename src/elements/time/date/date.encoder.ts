import type { FabricElement } from '@/types/element'
import type { DateElementConfig } from '@/types/elements'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'
import { getSavedFontFamily, getSavedFontSize } from '@/utils/systemFontElement'

export function encodeDate(element: FabricElement): DateElementConfig {
  const config: DateElementConfig = {
    id: String(element.id ?? ''),
    eleType: 'date',
    left: Math.round(element.left),
    top: Math.round(element.top),
    originX: (element.originX as unknown) as any,
    originY: (element.originY as unknown) as any,
    fontFamily: getSavedFontFamily(element, 'roboto-condensed-regular'),
    fontSize: getSavedFontSize(element, 14),
    fill: (element.fill as string) ?? '#ffffff',
    formatter: Number((element as any).formatter ?? 0),
    topBase: encodeTopBaseForElement(element),
  }
  return config
}

export function decodeDate(config: DateElementConfig): Partial<FabricElement> {
  const elementConfig: Partial<FabricElement> = {
    id: config.id,
    eleType: 'date',
    left: config.left,
    top: config.top,
    originX: config.originX as any,
    originY: config.originY as any,
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    fill: config.fill,
    formatter: config.formatter,
  }
  return elementConfig
}

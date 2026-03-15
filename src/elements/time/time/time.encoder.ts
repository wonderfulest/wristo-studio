import type { TimeElementConfig } from '@/types/elements'
import type { FabricElement } from '@/types/element'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'

export function encodeTime(element: FabricElement): TimeElementConfig {
  const config: TimeElementConfig = {
    id: String(element.id ?? ''),
    eleType: 'time',
    left: element.left,
    top: element.top,
    originX: element.originX,
    originY: element.originY,
    fontFamily: element.fontFamily || 'roboto-condensed-regular',
    fontSize: element.fontSize || 14,
    fill: element.fill as string,
    formatter: Number((element as any).formatter ?? 0),
    fontRenderType: (element as any).fontRenderType ?? 'truetype',
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

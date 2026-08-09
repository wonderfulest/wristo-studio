import type { FabricElement } from '@/types/element'
import type { DataElementConfig } from '@/types/elements/data'
import { nanoid } from 'nanoid'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'
import { getSavedFontFamily, getSavedFontSize } from '@/utils/systemFontElement'

export function encodeData(element: FabricElement): DataElementConfig {
  if (!element) throw new Error('Invalid element')

  const config: DataElementConfig = {
    eleType: 'data',
    id: String(element.id ?? ''),
    left: Math.round(element.left),
    top: Math.round(element.top),
    originX: (element.originX as any) ?? 'center',
    originY: (element.originY as any) ?? 'center',
    fill:
      typeof (element as any).fill === 'string'
        ? ((element as any).fill as string)
        : '#ffffff',
    fillProperty: (element as any).fillProperty ?? undefined,
    fontSize: getSavedFontSize(element, 14),
    fontFamily: getSavedFontFamily(element, 'roboto-condensed-regular'),
    fontSource: (element as any).fontSource,
    systemFont: (element as any).systemFont,
    dataProperty: (element as any).dataProperty ?? undefined,
    goalProperty: (element as any).goalProperty ?? undefined,
    metricSymbol: String((element as any).metricSymbol ?? ''),
    topBase: encodeTopBaseForElement(element as any),
  }

  // 如果 dataProperty 和 goalProperty 都为空，抛出错误
  if (config.dataProperty == null && config.goalProperty == null) {
    const eleId = String(element.id ?? '')
    const eleType = String((element as any).eleType ?? 'data')
    const eleLeft = Math.round(
      Number((element as any).left ?? config.left ?? 0),
    )
    const eleTop = Math.round(Number((element as any).top ?? config.top ?? 0))
    throw new Error(
      `Invalid element: dataProperty and goalProperty are both null (type=${eleType}, id=${eleId}, left=${eleLeft}, top=${eleTop})`,
    )
  }

  return config
}

export function decodeData(config: DataElementConfig): Partial<FabricElement> {
  const result: Partial<FabricElement> = {
    eleType: 'data',
    id: config.id ?? nanoid(),
    left: config.left,
    top: config.top,
    originX: config.originX,
    originY: config.originY,
    fill: config.fill,
    fillProperty: config.fillProperty ?? undefined,
    fontSize: config.fontSize,
    fontFamily: config.fontFamily,
    fontSource: config.fontSource,
    systemFont: config.systemFont,
    dataProperty: config.dataProperty ?? undefined,
    goalProperty: config.goalProperty ?? undefined,
    metricSymbol: config.metricSymbol ?? '',
  }

  return result as Partial<FabricElement>
}

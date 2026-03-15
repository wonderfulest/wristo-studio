import type { FabricElement } from '@/types/element'
import type { IconElementConfig } from '@/types/elements'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'

export function encodeIcon(element: FabricElement): IconElementConfig {
  if (!element) throw new Error('Invalid element')

  const config: IconElementConfig = {
    id: String(element.id ?? ''),
    eleType: 'icon',
    left: element.left,
    top: element.top,
    fill: element.fill as any,
    originX: element.originX as any,
    originY: element.originY as any,
    fontFamily: element.fontFamily as string,
    fontSize: Number(element.fontSize),
    iconFont: element.fontFamily as string,
    iconSize: Number(element.fontSize),
    dataProperty: (element as any).dataProperty,
    goalProperty: (element as any).goalProperty,
    metricSymbol: (element as any).metricSymbol,
    topBase: encodeTopBaseForElement(element),
  }

  // 如果 dataProperty 和 goalProperty 都为空，抛出错误
  if (config.dataProperty == null && config.goalProperty == null) {
    const eleId = String(element.id ?? '')
    const eleType = String((element as any).eleType ?? 'data')
    const eleLeft = Math.round(Number((element as any).left ?? config.left ?? 0))
    const eleTop = Math.round(Number((element as any).top ?? config.top ?? 0))
    throw new Error(
      `Invalid element: dataProperty and goalProperty are both null (type=${eleType}, id=${eleId}, left=${eleLeft}, top=${eleTop})`,
    )
  }

  return config
}

export function decodeIcon(config: IconElementConfig): Partial<FabricElement> {
  return {
    id: config.id,
    eleType: 'icon',
    left: config.left,
    top: config.top,
    fill: config.fill as any,
    originX: config.originX as any,
    originY: config.originY as any,
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    iconFont: config.iconFont,
    iconSize: config.iconSize,
    dataProperty: config.dataProperty,
    goalProperty: config.goalProperty,
    metricSymbol: config.metricSymbol,
  } as Partial<FabricElement>
}

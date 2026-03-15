import type { FabricElement } from '@/types/element'
import type { LabelElementConfig } from '@/types/elements/data'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'

export function encodeLabel(element: FabricElement): LabelElementConfig {
  if (!element) throw new Error('Invalid element')

  const config: LabelElementConfig = {
    id: (element.id as any) ?? '',
    eleType: 'label',
    left: element.left,
    top: element.top,
    originX: element.originX as any,
    originY: element.originY as any,
    fill: ((element.fill as any) as string) ?? '#ffffff',
    fontSize: Number(element.fontSize ?? 14),
    fontFamily: (element.fontFamily as string) ?? '',
    dataProperty: (element as any).dataProperty ?? undefined,
    goalProperty: (element as any).goalProperty ?? undefined,
    metricSymbol: (element as any).metricSymbol ?? undefined,
    metricValue: (element as any).metricValue ?? undefined,
    text:
      typeof (element as any).text === 'string'
        ? (element as any).text
        : '',
    topBase: encodeTopBaseForElement(element as any),
  }

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

export function decodeLabel(config: LabelElementConfig): Partial<FabricElement> {
  const element: Partial<FabricElement> = {
    id: config.id,
    eleType: 'label',
    left: config.left,
    top: config.top,
    originX: config.originX as any,
    originY: config.originY as any,
    fill: config.fill,
    fontSize: config.fontSize,
    fontFamily: config.fontFamily,
    dataProperty: config.dataProperty,
    goalProperty: config.goalProperty,
    metricSymbol: config.metricSymbol,
    metricValue: config.metricValue,
  }

  return element
}

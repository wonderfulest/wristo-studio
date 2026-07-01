import type { FabricElement } from '@/types/element'
import type { UnitElementConfig } from '@/types/elements/data'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'

export function encodeUnit(element: FabricElement): UnitElementConfig {
  if (!element) throw new Error('Invalid element')

  const config: UnitElementConfig = {
    id: String(element.id ?? ''),
    eleType: 'unit',
    left: Math.round(element.left),
    top: Math.round(element.top),
    originX: (element.originX as any) ?? 'center',
    originY: (element.originY as any) ?? 'center',
    fill:
      typeof (element as any).fill === 'string'
        ? ((element as any).fill as string)
        : '#ffffff',
    fontSize: Number((element.fontSize as any) ?? 14),
    fontFamily: String(
      (element.fontFamily as any) ?? 'roboto-condensed-regular',
    ),
    dataProperty: (element as any).dataProperty ?? undefined,
    goalProperty: (element as any).goalProperty ?? undefined,
    metricSymbol: String((element as any).metricSymbol ?? ''),
    metricValue: (element as any).metricValue ?? undefined,
    topBase: encodeTopBaseForElement(element as any),
  }

  if (config.dataProperty == null && config.goalProperty == null) {
    const eleId = String(element.id ?? '')
    const eleLeft = Math.round(Number((element as any).left ?? config.left ?? 0))
    const eleTop = Math.round(Number((element as any).top ?? config.top ?? 0))
    throw new Error(
      `Invalid element: dataProperty and goalProperty are both null (type=unit, id=${eleId}, left=${eleLeft}, top=${eleTop})`,
    )
  }

  return config
}

export function decodeUnit(config: UnitElementConfig): Partial<FabricElement> {
  return {
    eleType: 'unit',
    id: config.id,
    left: config.left,
    top: config.top,
    originX: config.originX,
    originY: config.originY,
    fill: config.fill,
    fontSize: config.fontSize,
    fontFamily: config.fontFamily,
    dataProperty: config.dataProperty ?? undefined,
    goalProperty: config.goalProperty ?? undefined,
    metricSymbol: config.metricSymbol ?? '',
    metricValue: config.metricValue ?? undefined,
  } as Partial<FabricElement>
}

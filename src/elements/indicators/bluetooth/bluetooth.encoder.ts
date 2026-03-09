import type { FabricElement } from '@/types/element'
import type { IndicatorElementConfig } from '@/types/elements'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'

export function encodeBluetooth(element: FabricElement): IndicatorElementConfig {
  if (!element) throw new Error('Invalid element')

  const config: IndicatorElementConfig = {
    id: (element.id as any) ?? '',
    eleType: 'bluetooth',
    left: element.left,
    top: element.top,
    originX: element.originX as any,
    originY: element.originY as any,
    fontFamily: (element.fontFamily as string) ?? '',
    fontSize: Number(element.fontSize ?? 0),
    fill: (element.fill as any) ?? '#ffffff',
    metricSymbol: (element as any).metricSymbol,
    topBase: encodeTopBaseForElement(element as any),
  }

  return config
}

export function decodeBluetooth(config: IndicatorElementConfig): Partial<FabricElement> {
  return {
    id: config.id,
    eleType: 'bluetooth',
    left: config.left,
    top: config.top,
    originX: config.originX as any,
    originY: config.originY as any,
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    fill: config.fill as any,
    metricSymbol: config.metricSymbol,
  } as Partial<FabricElement>
}

import type { FabricElement } from '@/types/element'
import type { IndicatorElementConfig } from '@/types/elements'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'
import type { IndicatorTextType } from '@/elements/indicators/common/indicatorText.renderer'

export function encodeIndicatorText(eleType: IndicatorTextType, element: FabricElement): IndicatorElementConfig {
  if (!element) throw new Error('Invalid indicator element')

  const anyEl = element as any

  const config: IndicatorElementConfig = {
    id: (anyEl.id as any) ?? '',
    eleType,
    left: anyEl.left,
    top: anyEl.top,
    originX: anyEl.originX as any,
    originY: anyEl.originY as any,
    fontFamily: (anyEl.fontFamily as string) ?? '',
    fontSize: Number(anyEl.fontSize ?? 0),
    fill: (anyEl.fill as any) ?? '#ffffff',
    metricSymbol: anyEl.metricSymbol,
    topBase: encodeTopBaseForElement(element as any),
  }

  return config
}

export function decodeIndicatorText(eleType: IndicatorTextType, config: IndicatorElementConfig): Partial<FabricElement> {
  return {
    id: config.id,
    eleType,
    left: config.left,
    top: config.top,
    originX: config.originX as any,
    originY: config.originY as any,
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    fill: config.fill as any,
    metricSymbol: (config as any).metricSymbol,
  } as Partial<FabricElement>
}

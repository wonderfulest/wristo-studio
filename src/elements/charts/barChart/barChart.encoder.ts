import type { FabricElement } from '@/types/element'
import type { BarChartElementConfig } from '@/types/elements/charts'
import { normalizeChartSize } from '@/elements/charts/chartSize'

export function encodeBarChart(element: FabricElement): BarChartElementConfig {
  if (!element) {
    throw new Error('Invalid element')
  }

  const anyEl = element as any
  const size = normalizeChartSize(
    'barChart',
    Number(anyEl.width ?? 0),
    Number(anyEl.height ?? 0),
    Number(anyEl.scaleX ?? 1),
    Number(anyEl.scaleY ?? 1),
  )

  return {
    eleType: 'barChart',
    id: String(anyEl.id ?? ''),
    left: Math.round(anyEl.left),
    top: Math.round(anyEl.top),
    originX: (anyEl.originX as any) ?? 'center',
    originY: (anyEl.originY as any) ?? 'center',
    width: size.width,
    height: size.height,
    chartProperty: anyEl.chartProperty,
    barWidth: anyEl.barWidth,
    colors: anyEl.colors,
  }
}

export function decodeBarChart(config: BarChartElementConfig): Partial<FabricElement> {
  return {
    eleType: 'barChart',
    id: config.id,
    left: config.left,
    top: config.top,
    originX: config.originX ?? 'center',
    originY: config.originY ?? 'center',
    width: config.width,
    height: config.height,
    chartProperty: config.chartProperty,
    barWidth: config.barWidth,
    colors: config.colors,
  } as Partial<FabricElement>
}

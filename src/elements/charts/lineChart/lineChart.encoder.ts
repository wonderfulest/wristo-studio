import type { FabricElement } from '@/types/element'
import type { LineChartElementConfig } from '@/types/elements/charts'
import { normalizeChartSize } from '@/elements/charts/chartSize'

export function encodeLineChart(element: FabricElement): LineChartElementConfig {
  if (!element) throw new Error('Invalid element')

  const anyEl = element as any
  const size = normalizeChartSize(
    'lineChart',
    Number(anyEl.width ?? 0),
    Number(anyEl.height ?? 0),
    Number(anyEl.scaleX ?? 1),
    Number(anyEl.scaleY ?? 1),
  )

  return {
    eleType: 'lineChart',
    id: String(anyEl.id ?? ''),
    left: Math.round(anyEl.left ?? 0),
    top: Math.round(anyEl.top ?? 0),
    originX: (anyEl.originX as any) ?? 'center',
    originY: (anyEl.originY as any) ?? 'center',
    width: size.width,
    height: size.height,
    chartProperty: anyEl.chartProperty,
    color: anyEl.color,
    colorProperty: anyEl.colorProperty,
    lineWidth: anyEl.lineWidth,
    showPoints: anyEl.showPoints,
    pointColor: anyEl.pointColor,
    pointColorProperty: anyEl.pointColorProperty,
    pointRadius: anyEl.pointRadius,
  }
}

export function decodeLineChart(config: LineChartElementConfig): Partial<FabricElement> {
  return {
    eleType: 'lineChart',
    id: config.id,
    left: config.left,
    top: config.top,
    originX: config.originX ?? 'center',
    originY: config.originY ?? 'center',
    width: config.width,
    height: config.height,
    chartProperty: config.chartProperty,
    color: config.color,
    colorProperty: config.colorProperty,
    lineWidth: config.lineWidth,
    showPoints: config.showPoints,
    pointColor: config.pointColor,
    pointColorProperty: config.pointColorProperty,
    pointRadius: config.pointRadius,
  } as Partial<FabricElement>
}

import type { FabricElement } from '@/types/element'
import type { LineChartElementConfig } from '@/types/elements/charts'

export function encodeLineChart(element: FabricElement): LineChartElementConfig {
  if (!element) throw new Error('Invalid element')

  const anyEl = element as any

  return {
    eleType: 'lineChart',
    id: String(anyEl.id ?? ''),
    left: Math.round(anyEl.left ?? 0),
    top: Math.round(anyEl.top ?? 0),
    originX: (anyEl.originX as any) ?? 'center',
    originY: (anyEl.originY as any) ?? 'center',
    width: Math.round(anyEl.width ?? 0),
    height: Math.round(anyEl.height ?? 0),
    chartProperty: anyEl.chartProperty,
    color: anyEl.color,
    lineWidth: anyEl.lineWidth,
    showPoints: anyEl.showPoints,
    pointColor: anyEl.pointColor,
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
    lineWidth: config.lineWidth,
    showPoints: config.showPoints,
    pointColor: config.pointColor,
    pointRadius: config.pointRadius,
  } as Partial<FabricElement>
}

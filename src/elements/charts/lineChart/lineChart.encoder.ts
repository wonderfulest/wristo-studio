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
    width: Math.round(anyEl.width ?? 0),
    height: Math.round(anyEl.height ?? 0),
    color: anyEl.color,
    bgColor: anyEl.bgColor,
    pointCount: anyEl.pointCount,
    fillMissing: anyEl.fillMissing,
    lineWidth: anyEl.lineWidth,
    smoothFactor: anyEl.smoothFactor,
    showPoints: anyEl.showPoints,
    pointColor: anyEl.pointColor,
    pointRadius: anyEl.pointRadius,
    showGrid: anyEl.showGrid,
    gridColor: anyEl.gridColor,
    gridYCount: anyEl.gridYCount,
    gridXCount: anyEl.gridXCount,
    showAxis: anyEl.showAxis,
    axisColor: anyEl.axisColor,
    showXLabels: anyEl.showXLabels,
    showYLabels: anyEl.showYLabels,
    xLabelColor: anyEl.xLabelColor,
    yLabelColor: anyEl.yLabelColor,
    xFont: anyEl.xFont,
    yFont: anyEl.yFont,
    xFontSize: anyEl.xFontSize,
    yFontSize: anyEl.yFontSize,
    timeFormat: anyEl.timeFormat,
    yLabelWidth: anyEl.yLabelWidth,
    xLabelHeight: anyEl.xLabelHeight,
    chartProperty: anyEl.chartProperty,
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
    color: config.color,
    bgColor: config.bgColor,
    pointCount: config.pointCount,
    fillMissing: config.fillMissing,
    lineWidth: config.lineWidth,
    smoothFactor: config.smoothFactor,
    showPoints: config.showPoints,
    pointColor: config.pointColor,
    pointRadius: config.pointRadius,
    showGrid: config.showGrid,
    gridColor: config.gridColor,
    gridYCount: config.gridYCount,
    gridXCount: config.gridXCount,
    showAxis: config.showAxis,
    axisColor: config.axisColor,
    showXLabels: config.showXLabels,
    showYLabels: config.showYLabels,
    xLabelColor: config.xLabelColor,
    yLabelColor: config.yLabelColor,
    xFont: config.xFont,
    yFont: config.yFont,
    xFontSize: config.xFontSize,
    yFontSize: config.yFontSize,
    timeFormat: config.timeFormat,
    yLabelWidth: config.yLabelWidth,
    xLabelHeight: config.xLabelHeight,
    chartProperty: config.chartProperty,
  } as Partial<FabricElement>
}

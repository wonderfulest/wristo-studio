import type { FabricElement } from '@/types/element'
import type { BarChartElementConfig } from '@/types/elements/charts'

export function encodeBarChart(element: FabricElement): BarChartElementConfig {
  if (!element) {
    throw new Error('Invalid element')
  }

  const anyEl = element as any

  return {
    eleType: 'barChart',
    id: String(anyEl.id ?? ''),
    left: Math.round(anyEl.left),
    top: Math.round(anyEl.top),
    width: Math.round(anyEl.width),
    height: Math.round(anyEl.height),
    color: anyEl.color,
    bgColor: anyEl.bgColor,
    pointCount: anyEl.pointCount ?? 240,
    fillMissing: anyEl.fillMissing !== undefined ? anyEl.fillMissing : true,
    minY: anyEl.minY,
    maxY: anyEl.maxY,
    barWidth: anyEl.barWidth,
    chartProperty: anyEl.chartProperty,
    showGrid: anyEl.showGrid !== undefined ? anyEl.showGrid : false,
    gridColor: anyEl.gridColor,
    gridYCount: anyEl.gridYCount,
    showXAxis: anyEl.showXAxis !== undefined ? anyEl.showXAxis : true,
    showYAxis: anyEl.showYAxis !== undefined ? anyEl.showYAxis : true,
    xAxisColor: anyEl.xAxisColor,
    yAxisColor: anyEl.yAxisColor,
    showXLabels: anyEl.showXLabels !== undefined ? anyEl.showXLabels : true,
    showYLabels: anyEl.showYLabels !== undefined ? anyEl.showYLabels : true,
    xLabelColor: anyEl.xLabelColor,
    yLabelColor: anyEl.yLabelColor,
    xFont: anyEl.xFont,
    yFont: anyEl.yFont,
    xFontSize: anyEl.xFontSize,
    yFontSize: anyEl.yFontSize,
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
    color: config.color,
    bgColor: config.bgColor,
    pointCount: config.pointCount,
    fillMissing: config.fillMissing,
    minY: config.minY,
    maxY: config.maxY,
    barWidth: config.barWidth,
    chartProperty: config.chartProperty,
    showGrid: config.showGrid,
    gridColor: config.gridColor,
    gridYCount: config.gridYCount,
    showXAxis: config.showXAxis,
    showYAxis: config.showYAxis,
    xAxisColor: config.xAxisColor,
    yAxisColor: config.yAxisColor,
    showXLabels: config.showXLabels,
    showYLabels: config.showYLabels,
    xLabelColor: config.xLabelColor,
    yLabelColor: config.yLabelColor,
    xFont: config.xFont,
    yFont: config.yFont,
    xFontSize: config.xFontSize,
    yFontSize: config.yFontSize,
  } as Partial<FabricElement>
}

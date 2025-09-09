import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useBarChartStore } from '@/stores/elements/charts/barChartElement'
import type { FabricElement } from '@/types/element'
import { BarChartElementConfig } from '@/types/elements/charts'

const encodeBarChart: EncoderFn<'barChart'> = (element: FabricElement) => {
  const store = useBarChartStore()
  const raw = store.encodeConfig(element as any) as any
  const cfg: BarChartElementConfig = {
    eleType: 'barChart',
    id: element.id!,
    left: Math.round(element.left),
    top: Math.round(element.top),
    originX: (element.originX as any) ?? 'center',
    originY: (element.originY as any) ?? 'center',
    width: Math.round(raw.width),
    height: Math.round(raw.height),
    color: raw.color,
    bgColor: raw.bgColor,
    pointCount: raw.pointCount,
    fillMissing: raw.fillMissing,
    minY: raw.minY,
    maxY: raw.maxY,
    barWidth: raw.barWidth,
    chartProperty: raw.chartProperty,
    showGrid: raw.showGrid,
    gridColor: raw.gridColor,
    gridYCount: raw.gridYCount,
    showXAxis: raw.showXAxis,
    showYAxis: raw.showYAxis,
    xAxisColor: raw.xAxisColor,
    yAxisColor: raw.yAxisColor,
    showXLabels: raw.showXLabels,
    showYLabels: raw.showYLabels,
    xLabelColor: raw.xLabelColor,
    yLabelColor: raw.yLabelColor,
    xFont: raw.xFont,
    yFont: raw.yFont,
    xFontSize: raw.xFontSize,
    yFontSize: raw.yFontSize,
  }
  return cfg
}

const decodeBarChart: DecoderFn<'barChart'> = (config: BarChartElementConfig) => {
  const partial: Partial<FabricElement> = {
    eleType: 'barChart',
    id: config.id,
    left: config.left,
    top: config.top,
    originX: config.originX,
    originY: config.originY,
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
  }
  return partial
}

const addElement: AddElementFn<'barChart'> = (_elementType, config: BarChartElementConfig) => {
  const store = useBarChartStore()
  return store.addElement(config)
}

export default () => {
  registerEncoder('barChart', encodeBarChart)
  registerDecoder('barChart', decodeBarChart)
  registerAddElement('barChart', addElement)
}

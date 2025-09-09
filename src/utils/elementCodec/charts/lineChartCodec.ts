import { LineChartElementConfig } from '@/types/elements/charts'
import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useLineChartStore } from '@/stores/elements/charts/lineChartElement'
import type { FabricElement } from '@/types/element'

const encodeLineChart: EncoderFn<'lineChart'> = (element: FabricElement) => {
  const store = useLineChartStore()
  const raw = store.encodeConfig(element as any)
  const cfg: LineChartElementConfig = {
    eleType: 'lineChart',
    id: element.id!,
    left: Math.round(element.left),
    top: Math.round(element.top),
    originX: (element.originX as any) ?? 'center',
    originY: (element.originY as any) ?? 'center',
    width: Math.round((raw as any).width),
    height: Math.round((raw as any).height),
    color: (raw as any).color,
    bgColor: (raw as any).bgColor,
    pointCount: (raw as any).pointCount,
    fillMissing: (raw as any).fillMissing,
    lineWidth: (raw as any).lineWidth,
    smoothFactor: (raw as any).smoothFactor,
    showPoints: (raw as any).showPoints,
    pointColor: (raw as any).pointColor,
    pointRadius: (raw as any).pointRadius,
    showGrid: (raw as any).showGrid,
    gridColor: (raw as any).gridColor,
    gridYCount: (raw as any).gridYCount,
    gridXCount: (raw as any).gridXCount,
    showAxis: (raw as any).showAxis,
    axisColor: (raw as any).axisColor,
    showXLabels: (raw as any).showXLabels,
    showYLabels: (raw as any).showYLabels,
    xLabelColor: (raw as any).xLabelColor,
    yLabelColor: (raw as any).yLabelColor,
    xFont: (raw as any).xFont,
    yFont: (raw as any).yFont,
    xFontSize: (raw as any).xFontSize,
    yFontSize: (raw as any).yFontSize,
    timeFormat: (raw as any).timeFormat,
    yLabelWidth: (raw as any).yLabelWidth,
    xLabelHeight: (raw as any).xLabelHeight,
    chartProperty: (raw as any).chartProperty,
  }
  return cfg
}

const decodeLineChart: DecoderFn<'lineChart'> = (config: LineChartElementConfig) => {
  // Convert typed config back to fabric-like partial for pre-creation state
  const partial: Partial<FabricElement> = {
    eleType: 'lineChart',
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
  }
  return partial
}

const addElement: AddElementFn<'lineChart'> = (_elementType, config: LineChartElementConfig) => {
  const store = useLineChartStore()
  return store.addElement(config)
}

export default () => {
  registerEncoder('lineChart', encodeLineChart)
  registerDecoder('lineChart', decodeLineChart)
  registerAddElement('lineChart', addElement)
}

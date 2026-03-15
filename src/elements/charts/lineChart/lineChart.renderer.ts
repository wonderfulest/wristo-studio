import { Group, Line, Circle, Rect, Text } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { LineChartElementConfig } from '@/types/elements/charts'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'

const DEFAULTS = {
  // provide explicit width/height so renderer can fall back safely
  width: 150,
  height: 50,
  color: '#ffffff',
  bgColor: '#000000',
  pointCount: 7,
  fillMissing: true,
  lineWidth: 2,
  smoothFactor: 0.2,
  showPoints: false,
  pointColor: '#ffffff',
  pointRadius: 2,
  showGrid: false,
  gridColor: '#555555',
  gridYCount: 3,
  gridXCount: 4,
  showAxis: false,
  axisColor: '#aaaaaa',
  showXLabels: false,
  showYLabels: false,
  xLabelColor: '#ffffff',
  yLabelColor: '#ffffff',
  xFont: undefined as string | undefined,
  yFont: undefined as string | undefined,
  xFontSize: 12,
  yFontSize: 12,
  timeFormat: 'HH:mm',
  yLabelWidth: 20,
  xLabelHeight: 16,
}

function createGrid(group: any) {
  const { width, height, gridYCount, gridXCount, gridColor } = group
  const stepY = height / (gridYCount + 1)
  for (let i = 1; i <= gridYCount; i++) {
    const y = -height / 2 + i * stepY
    const line: any = new Line([-width / 2, y, width / 2, y], {
      stroke: gridColor,
      strokeWidth: 1,
      selectable: false,
    })
    group.add(line)
  }
  const stepX = width / (gridXCount + 1)
  for (let j = 1; j <= gridXCount; j++) {
    const x = -width / 2 + j * stepX
    const line: any = new Line([x, -height / 2, x, height / 2], {
      stroke: gridColor,
      strokeWidth: 1,
      selectable: false,
    })
    group.add(line)
  }
}

function createAxis(group: any) {
  const { width, height, axisColor } = group
  const xAxis: any = new Line([-width / 2, height / 2, width / 2, height / 2], {
    stroke: axisColor,
    strokeWidth: 1,
    selectable: false,
  })
  const yAxis: any = new Line([-width / 2, -height / 2, -width / 2, height / 2], {
    stroke: axisColor,
    strokeWidth: 1,
    selectable: false,
  })
  group.add(xAxis)
  group.add(yAxis)
}

function createXLabels(group: any) {
  const { width, height, xLabelColor, xFont, xFontSize } = group
  const stepX = width / 4
  for (let i = 0; i <= 4; i++) {
    const x = -width / 2 + i * stepX
    const text: any = new Text(`${i}`, {
      left: x,
      top: height / 2 + 5,
      fontFamily: xFont as any,
      fontSize: xFontSize,
      fill: xLabelColor,
      selectable: false,
    })
    group.add(text)
  }
}

function createYLabels(group: any) {
  const { width, height, yLabelColor, yFont, yFontSize, gridYCount } = group
  const stepY = height / (gridYCount + 1)
  for (let i = 0; i <= gridYCount + 1; i++) {
    const y = -height / 2 + i * stepY
    const value = Math.round((1 - i / (gridYCount + 1)) * 100)
    const text: any = new Text(`${value}`, {
      left: -width / 2 - yFontSize,
      top: y - 6,
      fontFamily: yFont as any,
      fontSize: yFontSize,
      fill: yLabelColor,
      selectable: false,
    })
    group.add(text)
  }
}

function generateSampleData(count: number) {
  const data: Array<number | null> = []
  for (let i = 0; i < count; i++) {
    data.push(Math.random() > 0.1 ? Math.random() * 100 : null)
  }
  return data
}

function createPolyline(group: any) {
  const { width, height, color, lineWidth, showPoints, pointColor, pointRadius } = group
  const data = generateSampleData(group.pointCount)
  const valid = data.filter((v: number | null) => v !== null) as number[]
  const minY = Math.min(...valid) - 5
  const maxY = Math.max(...valid) + 5
  const rangeY = maxY - minY || 1

  const count = Math.max(2, group.pointCount)
  const stepX = width / (count - 1)
  let prev: { x: number; y: number } | null = null

  for (let i = 0; i < count; i++) {
    const v = data[i]
    if (v === null) continue
    const x = -width / 2 + i * stepX
    const y = -height / 2 + (height - ((v - minY) * (height - 2)) / rangeY)

    if (prev) {
      const seg: any = new Line([prev.x, prev.y, x, y], {
        stroke: color,
        strokeWidth: lineWidth,
        selectable: false,
      })
      group.add(seg)
    }
    if (showPoints) {
      const dot: any = new Circle({
        left: x - pointRadius,
        top: y - pointRadius,
        radius: pointRadius,
        fill: pointColor,
        selectable: false,
      })
      group.add(dot)
    }
    prev = { x, y }
  }
}

export async function createLineChart(config: LineChartElementConfig): Promise<FabricElement> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const canvas = canvasStore.canvas
  if (!canvas) {
    throw new Error('Canvas is not initialized, cannot add lineChart element')
  }

  const id = nanoid()
  const width = config.width || DEFAULTS.width
  const height = config.height || DEFAULTS.height
  const left = config.left ?? canvas.getWidth?.() ?? 227
  const top = config.top ?? canvas.getHeight?.() ?? 227

  const group: any = new Group([], {
    id,
    eleType: 'lineChart',
    left,
    top,
    originX: config.originX ?? 'center',
    originY: config.originY ?? 'center',
    width,
    height,
    color: config.color ?? DEFAULTS.color,
    bgColor: config.bgColor ?? DEFAULTS.bgColor,
    pointCount: config.pointCount ?? DEFAULTS.pointCount,
    fillMissing: config.fillMissing ?? DEFAULTS.fillMissing,
    lineWidth: config.lineWidth ?? DEFAULTS.lineWidth,
    smoothFactor: config.smoothFactor ?? DEFAULTS.smoothFactor,
    showPoints: config.showPoints ?? DEFAULTS.showPoints,
    pointColor: config.pointColor ?? DEFAULTS.pointColor,
    pointRadius: config.pointRadius ?? DEFAULTS.pointRadius,
    showGrid: config.showGrid ?? DEFAULTS.showGrid,
    gridColor: config.gridColor ?? DEFAULTS.gridColor,
    gridYCount: config.gridYCount ?? DEFAULTS.gridYCount,
    gridXCount: config.gridXCount ?? DEFAULTS.gridXCount,
    showAxis: config.showAxis ?? DEFAULTS.showAxis,
    axisColor: config.axisColor ?? DEFAULTS.axisColor,
    showXLabels: config.showXLabels ?? DEFAULTS.showXLabels,
    showYLabels: config.showYLabels ?? DEFAULTS.showYLabels,
    xLabelColor: config.xLabelColor ?? DEFAULTS.xLabelColor,
    yLabelColor: config.yLabelColor ?? DEFAULTS.yLabelColor,
    xFont: config.xFont ?? DEFAULTS.xFont,
    yFont: config.yFont ?? DEFAULTS.yFont,
    xFontSize: config.xFontSize ?? DEFAULTS.xFontSize,
    yFontSize: config.yFontSize ?? DEFAULTS.yFontSize,
    timeFormat: config.timeFormat ?? DEFAULTS.timeFormat,
    yLabelWidth: config.yLabelWidth ?? DEFAULTS.yLabelWidth,
    xLabelHeight: config.xLabelHeight ?? DEFAULTS.xLabelHeight,
    chartProperty: config.chartProperty,
  } as any)

  const bg: any = new Rect({
    left: -width / 2,
    top: -height / 2,
    width,
    height,
    fill: group.bgColor,
    selectable: false,
  })
  group.add(bg)

  if (group.showGrid) createGrid(group)
  if (group.showAxis) createAxis(group)
  if (group.showXLabels) createXLabels(group)
  createPolyline(group)
  if (group.showYLabels) createYLabels(group)

  group.set({ left, top, originX: 'center', originY: 'center' })
  group.setCoords()
  canvas.add(group)
  layerStore.addLayer(group)
  canvas.discardActiveObject()
  canvas.setActiveObject(group)
  canvas.renderAll()
  return group as FabricElement
}

export function updateLineChart(
  element: FabricElement,
  patch: Partial<LineChartElementConfig> = {},
): void {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas) return

  const group: any = canvas.getObjects().find((obj: any) => (obj as any).id === (element as any).id)
  if (!group || !group.getObjects) return

  const current = { left: group.left, top: group.top, width: group.width, height: group.height }
  Object.keys(patch).forEach((key) => {
    const k = key as keyof LineChartElementConfig
    const v = patch[k]
    if (v !== undefined) group.set(k as any, v as any)
  })

  group.remove(...group.getObjects())

  const bg: any = new Rect({
    left: -group.width / 2,
    top: -group.height / 2,
    width: group.width,
    height: group.height,
    fill: group.bgColor,
    selectable: false,
  })
  group.add(bg)

  if (group.showGrid) createGrid(group)
  if (group.showAxis) createAxis(group)
  if (group.showXLabels) createXLabels(group)
  createPolyline(group)
  if (group.showYLabels) createYLabels(group)

  group.set(current)
  group.setCoords()
  canvas.renderAll()
}

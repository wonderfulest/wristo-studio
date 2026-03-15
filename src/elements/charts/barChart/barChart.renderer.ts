import { Group, Line, Rect, Text } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { BarChartElementConfig } from '@/types/elements/charts'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'

function createGrid(group: any, width: number, height: number, gridYCount: number, gridColor: string) {
  const stepY = height / (gridYCount + 1)
  for (let i = 1; i <= gridYCount; i++) {
    const y = -height / 2 + i * stepY
    const line: any = new Line([-width / 2, y, width / 2, y], {
      stroke: gridColor,
      strokeWidth: 1,
      selectable: false,
      hasControls: false,
    })
    group.add(line)
  }
}

function createXAxis(group: any, width: number, height: number, xAxisColor: string) {
  const line: any = new Line([-width / 2, height / 2, width / 2, height / 2], {
    stroke: xAxisColor,
    strokeWidth: 1,
    selectable: false,
    hasControls: false,
  })
  group.add(line)
}

function createYAxis(group: any, width: number, height: number, yAxisColor: string) {
  const line: any = new Line([-width / 2, -height / 2, -width / 2, height / 2], {
    stroke: yAxisColor,
    strokeWidth: 1,
    selectable: false,
    hasControls: false,
  })
  group.add(line)
}

function createXLabels(
  group: any,
  width: number,
  height: number,
  xLabelColor: string,
  xFont: string | undefined,
  xFontSize: number,
) {
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
      hasControls: false,
    })
    group.add(text)
  }
}

function createYLabels(
  group: any,
  width: number,
  height: number,
  yLabelColor: string,
  yFont: string | undefined,
  yFontSize: number,
  gridYCount: number,
) {
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
      hasControls: false,
    })
    group.add(text)
  }
}

function generateSampleData(count: number) {
  const data: Array<number | null> = []
  for (let i = 0; i < count; i++) {
    if (Math.random() > 0.1) {
      data.push(Math.random() * 100)
    } else {
      data.push(null)
    }
  }
  return data
}

function createBars(
  group: any,
  width: number,
  height: number,
  pointCount: number,
  color: string,
  fillMissing: boolean,
  defaultBarWidth: number,
) {
  const stepX = width / pointCount
  const data = generateSampleData(pointCount)
  const barWidth = group.barWidth || defaultBarWidth

  const validData = data.filter((v: number | null) => v !== null) as number[]
  const minY = Math.min(...validData) - 5
  const maxY = Math.max(...validData) + 5
  const rangeY = maxY - minY

  for (let i = 0; i < pointCount; i++) {
    const value = i < data.length ? data[i] : null
    const xPos = -width / 2 + i * stepX

    if (value !== null) {
      const scaledY = ((value - minY) * (height - 2)) / rangeY
      const yTop = -height / 2 + (height - scaledY)

      const bar: any = new Rect({
        left: xPos - barWidth / 2,
        top: yTop,
        width: barWidth,
        height: height / 2 - yTop,
        fill: color,
        selectable: false,
        hasControls: false,
      })
      group.add(bar)
    } else if (fillMissing) {
      const missingBar: any = new Rect({
        left: xPos - barWidth / 2,
        top: -height / 2,
        width: barWidth,
        height: height,
        fill: '#666666',
        selectable: false,
        hasControls: false,
      })
      group.add(missingBar)
    }
  }
}

export async function createBarChart(config: BarChartElementConfig): Promise<FabricElement> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const canvas = canvasStore.canvas
  if (!canvas) {
    throw new Error('Canvas is not initialized, cannot add barChart element')
  }

  const id = nanoid()
  const width = config.width || 150
  const height = config.height || 50
  const pointCount = config.pointCount || 8
  const fillMissing = config.fillMissing !== undefined ? config.fillMissing : true
  const color = config.color || '#ffffff'
  const bgColor = config.bgColor || '#000000'
  const showGrid = config.showGrid !== undefined ? config.showGrid : false
  const gridColor = config.gridColor || '#555555'
  const gridYCount = config.gridYCount || 3
  const showXAxis = config.showXAxis !== undefined ? config.showXAxis : false
  const showYAxis = config.showYAxis !== undefined ? config.showYAxis : false
  const xAxisColor = config.xAxisColor || '#aaaaaa'
  const yAxisColor = config.yAxisColor || '#aaaaaa'
  const showXLabels = config.showXLabels !== undefined ? config.showXLabels : false
  const showYLabels = config.showYLabels !== undefined ? config.showYLabels : false
  const xLabelColor = config.xLabelColor || '#ffffff'
  const yLabelColor = config.yLabelColor || '#ffffff'
  const xFont = config.xFont
  const yFont = config.yFont
  const xFontSize = config.xFontSize || 12
  const yFontSize = config.yFontSize || 12
  const defaultBarWidth = 1

  const safePointCount = Math.max(1, pointCount)
  const barWidth = (width / safePointCount) * (2 / 3)

  const group: any = new Group([], {
    left: config.left,
    top: config.top,
    id,
    eleType: 'barChart',
    originX: config.originX ?? 'center',
    originY: config.originY ?? 'center',
    width,
    height,
    color,
    bgColor,
    pointCount,
    fillMissing,
    minY: config.minY,
    maxY: config.maxY,
    barWidth: barWidth,
    chartProperty: config.chartProperty,
    showGrid,
    gridColor,
    gridYCount,
    showXAxis,
    showYAxis,
    xAxisColor,
    yAxisColor,
    showXLabels,
    showYLabels,
    xLabelColor,
    yLabelColor,
    xFont,
    yFont,
    xFontSize,
    yFontSize,
    selectable: true,
    hasControls: false,
    hasBorders: true,
  } as any)

  const bgRect: any = new Rect({
    width,
    height,
    fill: bgColor,
    left: -width / 2,
    top: -height / 2,
  })
  group.add(bgRect)

  if (showGrid) {
    createGrid(group, width, height, gridYCount, gridColor)
  }
  if (showXAxis) {
    createXAxis(group, width, height, xAxisColor)
  }
  if (showYAxis) {
    createYAxis(group, width, height, yAxisColor)
  }
  if (showXLabels) {
    createXLabels(group, width, height, xLabelColor, xFont as any, xFontSize)
  }

  createBars(group, width, height, pointCount, color, fillMissing, defaultBarWidth)

  if (showYLabels) {
    createYLabels(group, width, height, yLabelColor, yFont as any, yFontSize, gridYCount)
  }

  group.setCoords()
  canvas.add(group)

  group.set({
    left: config.left,
    top: config.top,
  })
  group.setCoords()

  layerStore.addLayer(group as any)
  canvas.renderAll()
  canvas.discardActiveObject()
  canvas.setActiveObject(group)

  return group as FabricElement
}

export function updateBarChart(
  element: FabricElement,
  patch: Partial<BarChartElementConfig> = {},
): void {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas) return

  const group: any = canvas.getObjects().find((obj: any) => (obj as any).id === (element as any).id)
  if (!group || !group.getObjects) return

  const currentLeft = group.left
  const currentTop = group.top
  const currentWidth = group.width
  const currentHeight = group.height

  const updateProps: any = {
    color: patch.color,
    bgColor: patch.bgColor,
    pointCount: patch.pointCount,
    fillMissing: patch.fillMissing,
    minY: patch.minY,
    maxY: patch.maxY,
    originX: patch.originX,
    originY: patch.originY,
    barWidth: patch.barWidth,
    chartProperty: patch.chartProperty,
    showGrid: patch.showGrid,
    gridColor: patch.gridColor,
    gridYCount: patch.gridYCount,
    showXAxis: patch.showXAxis,
    showYAxis: patch.showYAxis,
    xAxisColor: patch.xAxisColor,
    yAxisColor: patch.yAxisColor,
    showXLabels: patch.showXLabels,
    showYLabels: patch.showYLabels,
    xLabelColor: patch.xLabelColor,
    yLabelColor: patch.yLabelColor,
    xFont: patch.xFont,
    yFont: patch.yFont,
    xFontSize: patch.xFontSize,
    yFontSize: patch.yFontSize,
  }

  Object.keys(updateProps).forEach((key) => {
    const k = key as keyof typeof updateProps
    if (updateProps[k] !== undefined) {
      group.set(k as any, updateProps[k])
    }
  })

  group.remove(...group.getObjects())

  const width = currentWidth
  const height = currentHeight
  const pointCount = patch.pointCount || group.pointCount || 240
  const color = patch.color || group.color || '#ffffff'
  const bgColor = patch.bgColor || group.bgColor || '#000000'
  const fillMissing =
    patch.fillMissing !== undefined
      ? patch.fillMissing
      : group.fillMissing !== undefined
        ? group.fillMissing
        : true

  const bgRect: any = new Rect({
    width,
    height,
    fill: bgColor,
    left: -width / 2,
    top: -height / 2,
    selectable: false,
    hasControls: false,
  })
  group.add(bgRect)

  if (group.showGrid) {
    createGrid(group, width, height, group.gridYCount, group.gridColor)
  }
  if (group.showXAxis) {
    createXAxis(group, width, height, group.xAxisColor)
  }
  if (group.showYAxis) {
    createYAxis(group, width, height, group.yAxisColor)
  }
  if (group.showXLabels) {
    createXLabels(group, width, height, group.xLabelColor, group.xFont, group.xFontSize)
  }

  createBars(group, width, height, pointCount, color, fillMissing, 1)

  if (group.showYLabels) {
    createYLabels(
      group,
      width,
      height,
      group.yLabelColor,
      group.yFont,
      group.yFontSize,
      group.gridYCount,
    )
  }

  group.set({
    left: currentLeft,
    top: currentTop,
    width: currentWidth,
    height: currentHeight,
  })
  group.setCoords()
  canvas.renderAll()
}

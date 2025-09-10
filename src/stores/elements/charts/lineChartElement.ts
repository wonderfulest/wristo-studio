import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { Group, Line, Circle, Rect, Text } from 'fabric'
import { nanoid } from 'nanoid'
import type { LineChartElementConfig } from '@/types/elements/charts'
import { FabricElement } from '@/types/element'

export const useLineChartStore = defineStore('lineChartElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return {
      baseStore,
      layerStore,
      defaults: {
        color: '#ffffff',
        bgColor: '#000000',
        pointCount: 120,
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
        showAxis: true,
        axisColor: '#aaaaaa',
        showXLabels: true,
        showYLabels: true,
        xLabelColor: '#ffffff',
        yLabelColor: '#ffffff',
        xFont: undefined as string | undefined,
        yFont: undefined as string | undefined,
        xFontSize: 12,
        yFontSize: 12,
        timeFormat: 'HH:mm',
        yLabelWidth: 20,
        xLabelHeight: 16,
      },
    }
  },

  actions: {
    addElement(config: LineChartElementConfig): Promise<FabricElement> {
      const id = nanoid()
      const width = config.width || 150
      const height = config.height || 50

      const group: any = new Group([], {
        id,
        eleType: 'lineChart',
        left: config.left,
        top: config.top,
        originX: 'center',
        originY: 'center',
        width,
        height,
        color: config.color ?? this.defaults.color,
        bgColor: config.bgColor ?? this.defaults.bgColor,
        pointCount: config.pointCount ?? this.defaults.pointCount,
        fillMissing: config.fillMissing ?? this.defaults.fillMissing,
        lineWidth: config.lineWidth ?? this.defaults.lineWidth,
        smoothFactor: config.smoothFactor ?? this.defaults.smoothFactor,
        showPoints: config.showPoints ?? this.defaults.showPoints,
        pointColor: config.pointColor ?? this.defaults.pointColor,
        pointRadius: config.pointRadius ?? this.defaults.pointRadius,
        showGrid: config.showGrid ?? this.defaults.showGrid,
        gridColor: config.gridColor ?? this.defaults.gridColor,
        gridYCount: config.gridYCount ?? this.defaults.gridYCount,
        gridXCount: config.gridXCount ?? this.defaults.gridXCount,
        showAxis: config.showAxis ?? this.defaults.showAxis,
        axisColor: config.axisColor ?? this.defaults.axisColor,
        showXLabels: config.showXLabels ?? this.defaults.showXLabels,
        showYLabels: config.showYLabels ?? this.defaults.showYLabels,
        xLabelColor: config.xLabelColor ?? this.defaults.xLabelColor,
        yLabelColor: config.yLabelColor ?? this.defaults.yLabelColor,
        xFont: config.xFont ?? this.defaults.xFont,
        yFont: config.yFont ?? this.defaults.yFont,
        xFontSize: config.xFontSize ?? this.defaults.xFontSize,
        yFontSize: config.yFontSize ?? this.defaults.yFontSize,
        timeFormat: config.timeFormat ?? this.defaults.timeFormat,
        yLabelWidth: config.yLabelWidth ?? this.defaults.yLabelWidth,
        xLabelHeight: config.xLabelHeight ?? this.defaults.xLabelHeight,
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

      if (group.showGrid) this.createGrid(group)
      if (group.showAxis) this.createAxis(group)
      if (group.showXLabels) this.createXLabels(group)

      this.createPolyline(group)

      if (group.showYLabels) this.createYLabels(group)

      group.setCoords()
      this.baseStore.canvas?.add(group)
      this.layerStore.addLayer(group)
      this.baseStore.canvas?.discardActiveObject()
      this.baseStore.canvas?.setActiveObject(group)
      this.baseStore.canvas?.renderAll()
      return group
    },

    createGrid(group: any) {
      const { width, height, gridYCount, gridXCount, gridColor } = group
      const stepY = height / (gridYCount + 1)
      for (let i = 1; i <= gridYCount; i++) {
        const y = -height / 2 + i * stepY
        const line: any = new Line([-width / 2, y, width / 2, y], { stroke: gridColor, strokeWidth: 1, selectable: false })
        group.add(line)
      }
      const stepX = width / (gridXCount + 1)
      for (let j = 1; j <= gridXCount; j++) {
        const x = -width / 2 + j * stepX
        const line: any = new Line([x, -height / 2, x, height / 2], { stroke: gridColor, strokeWidth: 1, selectable: false })
        group.add(line)
      }
    },

    createAxis(group: any) {
      const { width, height, axisColor } = group
      const xAxis: any = new Line([-width / 2, height / 2, width / 2, height / 2], { stroke: axisColor, strokeWidth: 1, selectable: false })
      const yAxis: any = new Line([-width / 2, -height / 2, -width / 2, height / 2], { stroke: axisColor, strokeWidth: 1, selectable: false })
      group.add(xAxis)
      group.add(yAxis)
    },

    createXLabels(group: any) {
      const { width, height, xLabelColor, xFont, xFontSize } = group
      const stepX = width / 4
      for (let i = 0; i <= 4; i++) {
        const x = -width / 2 + i * stepX
        const text: any = new Text(`${i}`, { left: x, top: height / 2 + 5, fontFamily: xFont as any, fontSize: xFontSize, fill: xLabelColor, selectable: false })
        group.add(text)
      }
    },

    createYLabels(group: any) {
      const { width, height, yLabelColor, yFont, yFontSize, gridYCount } = group
      const stepY = height / (gridYCount + 1)
      for (let i = 0; i <= gridYCount + 1; i++) {
        const y = -height / 2 + i * stepY
        const value = Math.round((1 - i / (gridYCount + 1)) * 100)
        const text: any = new Text(`${value}`, { left: -width / 2 - yFontSize, top: y - 6, fontFamily: yFont as any, fontSize: yFontSize, fill: yLabelColor, selectable: false })
        group.add(text)
      }
    },

    createPolyline(group: any) {
      const { width, height, color, lineWidth, showPoints, pointColor, pointRadius } = group
      const data = this.generateSampleData(group.pointCount)
      const valid = data.filter((v: number | null) => v !== null) as number[]
      const minY = Math.min(...valid) - 5
      const maxY = Math.max(...valid) + 5
      const rangeY = maxY - minY

      const stepX = width / (group.pointCount - 1)
      let prev: { x: number; y: number } | null = null

      for (let i = 0; i < group.pointCount; i++) {
        const v = data[i]
        if (v === null) continue
        const x = -width / 2 + i * stepX
        const y = -height / 2 + (height - ((v - minY) * (height - 2)) / rangeY)

        if (prev) {
          const seg: any = new Line([prev.x, prev.y, x, y], { stroke: color, strokeWidth: lineWidth, selectable: false })
          group.add(seg)
        }
        if (showPoints) {
          const dot: any = new Circle({ left: x - pointRadius, top: y - pointRadius, radius: pointRadius, fill: pointColor, selectable: false })
          group.add(dot)
        }
        prev = { x, y }
      }
    },

    generateSampleData(count: number) {
      const data: Array<number | null> = []
      for (let i = 0; i < count; i++) {
        data.push(Math.random() > 0.1 ? Math.random() * 100 : null)
      }
      return data
    },

    updateElement(element: any, config: Partial<LineChartElementConfig> = {}) {
      if (!this.baseStore.canvas) return
      const group: any = this.baseStore.canvas.getObjects().find((obj: any) => (obj as any).id === element.id)
      if (!group || !group.getObjects) return

      const current = { left: group.left, top: group.top, width: group.width, height: group.height }
      Object.keys(config).forEach((key) => {
        const k = key as keyof LineChartElementConfig
        const v = config[k]
        if (v !== undefined) group.set(k as any, v as any)
      })

      group.remove(...group.getObjects())

      const bg: any = new Rect({ left: -group.width / 2, top: -group.height / 2, width: group.width, height: group.height, fill: group.bgColor, selectable: false })
      group.add(bg)
      if (group.showGrid) this.createGrid(group)
      if (group.showAxis) this.createAxis(group)
      if (group.showXLabels) this.createXLabels(group)
      this.createPolyline(group)
      if (group.showYLabels) this.createYLabels(group)

      group.set(current)
      group.setCoords()
      this.baseStore.canvas?.renderAll()
    },

    encodeConfig(element: any): any {
      if (!element) throw new Error('Invalid element')
      return {
        type: 'lineChart',
        x: Math.round(element.left),
        y: Math.round(element.top),
        width: Math.round(element.width),
        height: Math.round(element.height),
        color: element.color ?? this.defaults.color,
        bgColor: element.bgColor ?? this.defaults.bgColor,
        pointCount: element.pointCount ?? this.defaults.pointCount,
        fillMissing: element.fillMissing ?? this.defaults.fillMissing,
        lineWidth: element.lineWidth ?? this.defaults.lineWidth,
        smoothFactor: element.smoothFactor ?? this.defaults.smoothFactor,
        showPoints: element.showPoints ?? this.defaults.showPoints,
        pointColor: element.pointColor ?? this.defaults.pointColor,
        pointRadius: element.pointRadius ?? this.defaults.pointRadius,
        showGrid: element.showGrid ?? this.defaults.showGrid,
        gridColor: element.gridColor ?? this.defaults.gridColor,
        gridYCount: element.gridYCount ?? this.defaults.gridYCount,
        gridXCount: element.gridXCount ?? this.defaults.gridXCount,
        showAxis: element.showAxis ?? this.defaults.showAxis,
        axisColor: element.axisColor ?? this.defaults.axisColor,
        showXLabels: element.showXLabels ?? this.defaults.showXLabels,
        showYLabels: element.showYLabels ?? this.defaults.showYLabels,
        xLabelColor: element.xLabelColor ?? this.defaults.xLabelColor,
        yLabelColor: element.yLabelColor ?? this.defaults.yLabelColor,
        xFont: element.xFont ?? this.defaults.xFont,
        yFont: element.yFont ?? this.defaults.yFont,
        xFontSize: element.xFontSize ?? this.defaults.xFontSize,
        yFontSize: element.yFontSize ?? this.defaults.yFontSize,
        timeFormat: element.timeFormat ?? this.defaults.timeFormat,
        yLabelWidth: element.yLabelWidth ?? this.defaults.yLabelWidth,
        xLabelHeight: element.xLabelHeight ?? this.defaults.xLabelHeight,
        chartProperty: element.chartProperty,
      }
    },

    decodeConfig(config: any): LineChartElementConfig {
      return {
        eleType: 'lineChart',
        left: config.x,
        top: config.y,
        width: config.width,
        height: config.height,
        color: config.color ?? this.defaults.color,
        bgColor: config.bgColor ?? this.defaults.bgColor,
        pointCount: config.pointCount ?? this.defaults.pointCount,
        fillMissing: config.fillMissing ?? this.defaults.fillMissing,
        lineWidth: config.lineWidth ?? this.defaults.lineWidth,
        smoothFactor: config.smoothFactor ?? this.defaults.smoothFactor,
        showPoints: config.showPoints ?? this.defaults.showPoints,
        pointColor: config.pointColor ?? this.defaults.pointColor,
        pointRadius: config.pointRadius ?? this.defaults.pointRadius,
        showGrid: config.showGrid ?? this.defaults.showGrid,
        gridColor: config.gridColor ?? this.defaults.gridColor,
        gridYCount: config.gridYCount ?? this.defaults.gridYCount,
        gridXCount: config.gridXCount ?? this.defaults.gridXCount,
        showAxis: config.showAxis ?? this.defaults.showAxis,
        axisColor: config.axisColor ?? this.defaults.axisColor,
        showXLabels: config.showXLabels ?? this.defaults.showXLabels,
        showYLabels: config.showYLabels ?? this.defaults.showYLabels,
        xLabelColor: config.xLabelColor ?? this.defaults.xLabelColor,
        yLabelColor: config.yLabelColor ?? this.defaults.yLabelColor,
        xFont: config.xFont ?? this.defaults.xFont,
        yFont: config.yFont ?? this.defaults.yFont,
        xFontSize: config.xFontSize ?? this.defaults.xFontSize,
        yFontSize: config.yFontSize ?? this.defaults.yFontSize,
        timeFormat: config.timeFormat ?? this.defaults.timeFormat,
        yLabelWidth: config.yLabelWidth ?? this.defaults.yLabelWidth,
        xLabelHeight: config.xLabelHeight ?? this.defaults.xLabelHeight,
        chartProperty: config.chartProperty,
      }
    },
  },
})

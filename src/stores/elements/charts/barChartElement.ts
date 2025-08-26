import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { Group, Line, Rect, Text } from 'fabric'
import { nanoid } from 'nanoid'
import type { BarChartElementConfig } from '@/types/elements/charts'
import type { ElementConfig, FabricElement } from '@/types/element'

export const useBarChartStore = defineStore('barChartElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return {
      baseStore,
      layerStore,
      defaultColors: {
        color: '#ffffff',
        bgColor: '#000000',
        gridColor: '#555555',
        xAxisColor: '#aaaaaa',
        yAxisColor: '#aaaaaa',
        xLabelColor: '#ffffff',
        yLabelColor: '#ffffff',
      },
      defaultBarWidth: 1,
      defaultGridYCount: 3,
      defaultXFontSize: 12,
      defaultYFontSize: 12,
    }
  },

  actions: {
    addElement(config: BarChartElementConfig): Promise<FabricElement> {
      const id = nanoid()

      const width = config.width || 150
      const height = config.height || 50
      const pointCount = config.pointCount || 240
      const fillMissing = config.fillMissing !== undefined ? config.fillMissing : true
      const minY = config.minY
      const maxY = config.maxY

      const color = config.color || this.defaultColors.color
      const bgColor = config.bgColor || this.defaultColors.bgColor

      const showGrid = config.showGrid !== undefined ? config.showGrid : false
      const gridColor = config.gridColor || this.defaultColors.gridColor
      const gridYCount = config.gridYCount || this.defaultGridYCount
      const showXAxis = config.showXAxis !== undefined ? config.showXAxis : true
      const showYAxis = config.showYAxis !== undefined ? config.showYAxis : true
      const xAxisColor = config.xAxisColor || this.defaultColors.xAxisColor
      const yAxisColor = config.yAxisColor || this.defaultColors.yAxisColor
      const showXLabels = config.showXLabels !== undefined ? config.showXLabels : true
      const showYLabels = config.showYLabels !== undefined ? config.showYLabels : true
      const xLabelColor = config.xLabelColor || this.defaultColors.xLabelColor
      const yLabelColor = config.yLabelColor || this.defaultColors.yLabelColor
      const xFont = config.xFont
      const yFont = config.yFont
      const xFontSize = config.xFontSize || this.defaultXFontSize
      const yFontSize = config.yFontSize || this.defaultYFontSize

      const barWidth = config.barWidth || this.defaultBarWidth
      const group: any = new Group([], {
        left: config.left,
        top: config.top,
        id,
        eleType: 'barChart',
        selectable: true,
        hasControls: true,
        hasBorders: true,
        originX: 'center',
        originY: 'center',
        width: width,
        height: height,
        color: color,
        bgColor: bgColor,
        pointCount: pointCount,
        fillMissing: fillMissing,
        minY: minY,
        maxY: maxY,
        barWidth: barWidth,
        chartProperty: config.chartProperty,
        showGrid: showGrid,
        gridColor: gridColor,
        gridYCount: gridYCount,
        showXAxis: showXAxis,
        showYAxis: showYAxis,
        xAxisColor: xAxisColor,
        yAxisColor: yAxisColor,
        showXLabels: showXLabels,
        showYLabels: showYLabels,
        xLabelColor: xLabelColor,
        yLabelColor: yLabelColor,
        xFont: xFont,
        yFont: yFont,
        xFontSize: xFontSize,
        yFontSize: yFontSize,
      } as any)

      const bgRect: any = new Rect({
        width: width,
        height: height,
        fill: bgColor,
        left: -width / 2,
        top: -height / 2,
        selectable: false,
        hasControls: false,
      })
      group.add(bgRect)

      if (showGrid) {
        this.createGrid(group, width, height, gridYCount, gridColor)
      }
      if (showXAxis) {
        this.createXAxis(group, width, height, xAxisColor)
      }
      if (showYAxis) {
        this.createYAxis(group, width, height, yAxisColor)
      }
      if (showXLabels) {
        this.createXLabels(group, width, height, xLabelColor, xFont as any, xFontSize)
      }

      this.createBars(group, width, height, pointCount, color, fillMissing)

      if (showYLabels) {
        this.createYLabels(group, width, height, yLabelColor, yFont as any, yFontSize, gridYCount)
      }

      group.setCoords()

      this.baseStore.canvas?.add(group)

      group.set({
        left: config.left,
        top: config.top,
      })
      group.setCoords()

      this.layerStore.addLayer(group)
      this.baseStore.canvas?.renderAll()

      this.baseStore.canvas?.discardActiveObject()
      this.baseStore.canvas?.setActiveObject(group)
      return group
    },

    createGrid(group: any, width: number, height: number, gridYCount: number, gridColor: string) {
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
    },

    createXAxis(group: any, width: number, height: number, xAxisColor: string) {
      const line: any = new Line([-width / 2, height / 2, width / 2, height / 2], {
        stroke: xAxisColor,
        strokeWidth: 1,
        selectable: false,
        hasControls: false,
      })
      group.add(line)
    },

    createYAxis(group: any, width: number, height: number, yAxisColor: string) {
      const line: any = new Line([-width / 2, -height / 2, -width / 2, height / 2], {
        stroke: yAxisColor,
        strokeWidth: 1,
        selectable: false,
        hasControls: false,
      })
      group.add(line)
    },

    createXLabels(group: any, width: number, height: number, xLabelColor: string, xFont: string | undefined, xFontSize: number) {
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
    },

    createYLabels(group: any, width: number, height: number, yLabelColor: string, yFont: string | undefined, yFontSize: number, gridYCount: number) {
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
    },

    createBars(group: any, width: number, height: number, pointCount: number, color: string, fillMissing: boolean) {
      const stepX = width / pointCount
      const data = this.generateSampleData(pointCount)
      const barWidth = group.barWidth || this.defaultBarWidth

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
    },

    generateSampleData(count: number) {
      const data: Array<number | null> = []
      for (let i = 0; i < count; i++) {
        if (Math.random() > 0.1) {
          data.push(Math.random() * 100)
        } else {
          data.push(null)
        }
      }
      return data
    },

    updateElement(element: any, config: Partial<BarChartElementConfig> = {}) {
      if (!this.baseStore.canvas) return
      const group: any = this.baseStore.canvas.getObjects().find((obj: any) => (obj as any).id === element.id)
      if (!group || !group.getObjects) return

      const currentLeft = group.left
      const currentTop = group.top
      const currentWidth = group.width
      const currentHeight = group.height

      const updateProps: any = {
        color: config.color,
        bgColor: config.bgColor,
        pointCount: config.pointCount,
        fillMissing: config.fillMissing,
        minY: config.minY,
        maxY: config.maxY,
        originX: config.originX,
        originY: config.originY,
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

      Object.keys(updateProps).forEach((key) => {
        const k = key as keyof typeof updateProps
        if (updateProps[k] !== undefined) {
          group.set(k as any, updateProps[k])
        }
      })

      group.remove(...group.getObjects())

      const width = currentWidth
      const height = currentHeight
      const pointCount = config.pointCount || group.pointCount || 240
      const color = config.color || group.color || this.defaultColors.color
      const bgColor = config.bgColor || group.bgColor || this.defaultColors.bgColor
      const fillMissing = config.fillMissing !== undefined ? config.fillMissing : group.fillMissing !== undefined ? group.fillMissing : true
      // bar width is stored on group; no need to keep a local variable here

      const bgRect: any = new Rect({
        width: width,
        height: height,
        fill: bgColor,
        left: -width / 2,
        top: -height / 2,
        selectable: false,
        hasControls: false,
      })
      group.add(bgRect)

      if (group.showGrid) {
        this.createGrid(group, width, height, group.gridYCount, group.gridColor)
      }
      if (group.showXAxis) {
        this.createXAxis(group, width, height, group.xAxisColor)
      }
      if (group.showYAxis) {
        this.createYAxis(group, width, height, group.yAxisColor)
      }

      if (group.showXLabels) {
        this.createXLabels(group, width, height, group.xLabelColor, group.xFont, group.xFontSize)
      }

      this.createBars(group, width, height, pointCount, color, fillMissing)

      if (group.showYLabels) {
        this.createYLabels(group, width, height, group.yLabelColor, group.yFont, group.yFontSize, group.gridYCount)
      }

      group.set({
        left: currentLeft,
        top: currentTop,
        width: currentWidth,
        height: currentHeight,
      })
      group.setCoords()
      this.baseStore.canvas?.renderAll()
    },

    encodeConfig(element: FabricElement): ElementConfig {
      if (!element) {
        throw new Error('Invalid element')
      }

      return {
        type: 'barChart',
        x: Math.round(element.left),
        y: Math.round(element.top),
        width: Math.round(element.width),
        height: Math.round(element.height),
        color: element.color || this.defaultColors.color,
        bgColor: element.bgColor || this.defaultColors.bgColor,
        pointCount: element.pointCount || 240,
        fillMissing: element.fillMissing !== undefined ? element.fillMissing : true,
        minY: element.minY,
        maxY: element.maxY,
        barWidth: element.barWidth || this.defaultBarWidth,
        chartProperty: element.chartProperty,
        showGrid: element.showGrid !== undefined ? element.showGrid : false,
        gridColor: element.gridColor || this.defaultColors.gridColor,
        gridYCount: element.gridYCount || this.defaultGridYCount,
        showXAxis: element.showXAxis !== undefined ? element.showXAxis : true,
        showYAxis: element.showYAxis !== undefined ? element.showYAxis : true,
        xAxisColor: element.xAxisColor || this.defaultColors.xAxisColor,
        yAxisColor: element.yAxisColor || this.defaultColors.yAxisColor,
        showXLabels: element.showXLabels !== undefined ? element.showXLabels : true,
        showYLabels: element.showYLabels !== undefined ? element.showYLabels : true,
        xLabelColor: element.xLabelColor || this.defaultColors.xLabelColor,
        yLabelColor: element.yLabelColor || this.defaultColors.yLabelColor,
        xFont: element.xFont,
        yFont: element.yFont,
        xFontSize: element.xFontSize || this.defaultXFontSize,
        yFontSize: element.yFontSize || this.defaultYFontSize,
      }
    },

    decodeConfig(config: ElementConfig): BarChartElementConfig {
      return {
        type: 'barChart',
        eleType: 'barChart',
        left: config.x,
        top: config.y,
        width: config.width,
        height: config.height,
        color: config.color || this.defaultColors.color,
        bgColor: config.bgColor || this.defaultColors.bgColor,
        pointCount: config.pointCount || 240,
        fillMissing: config.fillMissing !== undefined ? config.fillMissing : true,
        minY: config.minY,
        maxY: config.maxY,
        barWidth: config.barWidth || this.defaultBarWidth,
        chartProperty: config.chartProperty,
        showGrid: config.showGrid !== undefined ? config.showGrid : false,
        gridColor: config.gridColor || this.defaultColors.gridColor,
        gridYCount: config.gridYCount || this.defaultGridYCount,
        showXAxis: config.showXAxis !== undefined ? config.showXAxis : true,
        showYAxis: config.showYAxis !== undefined ? config.showYAxis : true,
        xAxisColor: config.xAxisColor || this.defaultColors.xAxisColor,
        yAxisColor: config.yAxisColor || this.defaultColors.yAxisColor,
        showXLabels: config.showXLabels !== undefined ? config.showXLabels : true,
        showYLabels: config.showYLabels !== undefined ? config.showYLabels : true,
        xLabelColor: config.xLabelColor || this.defaultColors.xLabelColor,
        yLabelColor: config.yLabelColor || this.defaultColors.yLabelColor,
        xFont: config.xFont,
        yFont: config.yFont,
        xFontSize: config.xFontSize || this.defaultXFontSize,
        yFontSize: config.yFontSize || this.defaultYFontSize,
      }
    },
  },
})

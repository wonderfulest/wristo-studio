import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { Group, Line, Circle, Rect, Text, Polyline } from 'fabric'
import { nanoid } from 'nanoid'

export const useLineChartStore = defineStore('lineChartElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return {
      baseStore,
      layerStore,
      defaultColors: {
        color: '#ff0000',    // 红色线条
        bgColor: 'transparent',  // 透明背景
        pointColor: '#ff0000', // 红色数据点
        gridColor: '#555555', // 深灰色网格
        axisColor: '#555555', // 深灰色坐标轴
        xLabelColor: '#aaaaaa', // X轴标签颜色
        yLabelColor: '#aaaaaa'  // Y轴标签颜色
      },
      defaultLineWidth: 2,     // 默认线条宽度
      defaultPointRadius: 1,   // 默认数据点半径
      defaultSmoothFactor: 0.2, // 默认平滑因子
      defaultGridYCount: 8,    // Y轴网格数量（6-22分成8格）
      defaultGridXCount: 6,    // X轴网格数量（7天）
      defaultXFontSize: 12,    // X轴标签字体大小
      defaultYFontSize: 12,    // Y轴标签字体大小
      defaultYLabelWidth: 20,  // Y轴标签宽度
      defaultXLabelHeight: 20, // X轴标签高度
    }
  },

  actions: {
    addElement(config) {
      const id = nanoid()
      
      // 基础尺寸配置
      const width = config.width || 150
      const height = config.height || 50
      const pointCount = config.pointCount || 240
      const fillMissing = config.fillMissing !== undefined ? config.fillMissing : true

      // 样式配置
      const color = config.color || this.defaultColors.color
      const bgColor = config.bgColor || this.defaultColors.bgColor
      const lineWidth = config.lineWidth || this.defaultLineWidth
      const smoothFactor = config.smoothFactor || this.defaultSmoothFactor
      const showPoints = config.showPoints !== undefined ? config.showPoints : true
      const pointColor = config.pointColor || this.defaultColors.pointColor
      const pointRadius = config.pointRadius || this.defaultPointRadius

      // 图表显示配置
      const showGrid = config.showGrid !== undefined ? config.showGrid : true
      const gridColor = config.gridColor || this.defaultColors.gridColor
      const gridYCount = config.gridYCount || this.defaultGridYCount
      const gridXCount = config.gridXCount || this.defaultGridXCount
      const showAxis = config.showAxis !== undefined ? config.showAxis : true
      const axisColor = config.axisColor || this.defaultColors.axisColor
      const showXLabels = config.showXLabels !== undefined ? config.showXLabels : true
      const showYLabels = config.showYLabels !== undefined ? config.showYLabels : true
      const xLabelColor = config.xLabelColor || this.defaultColors.xLabelColor
      const yLabelColor = config.yLabelColor || this.defaultColors.yLabelColor
      const xFont = config.xFont
      const yFont = config.yFont
      const xFontSize = config.xFontSize || this.defaultXFontSize
      const yFontSize = config.yFontSize || this.defaultYFontSize
      const timeFormat = config.timeFormat || 'MM/dd'
      const yLabelWidth = config.yLabelWidth || this.defaultYLabelWidth
      const xLabelHeight = config.xLabelHeight || this.defaultXLabelHeight

      // 创建组
      const group = new Group([], {
        left: config.left,
        top: config.top,
        id,
        eleType: 'lineChart',
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
        lineWidth: lineWidth,
        smoothFactor: smoothFactor,
        showPoints: showPoints,
        pointColor: pointColor,
        pointRadius: pointRadius,
        showGrid: showGrid,
        gridColor: gridColor,
        gridYCount: gridYCount,
        gridXCount: gridXCount,
        showAxis: showAxis,
        axisColor: axisColor,
        showXLabels: showXLabels,
        showYLabels: showYLabels,
        xLabelColor: xLabelColor,
        yLabelColor: yLabelColor,
        timeFormat: timeFormat,
        yLabelWidth: yLabelWidth,
        xLabelHeight: xLabelHeight,
        xFont: xFont,
        yFont: yFont,
        xFontSize: xFontSize,
        yFontSize: yFontSize,
        chartProperty: config.chartProperty
      })

      // 创建背景
      const bgRect = new Rect({
        width: width,
        height: height,
        fill: bgColor,
        left: -width/2,
        top: -height/2,
        selectable: false,
        hasControls: false
      })
      group.add(bgRect)

      // 创建网格
      if (showGrid) {
        this.createGrid(group, width, height, gridYCount, gridXCount, gridColor)
      }

      // 创建坐标轴
      if (showAxis) {
        this.createAxis(group, width, height, axisColor)
      }

      // 创建折线图
      this.createLineChart(group, width, height, pointCount, color, lineWidth, smoothFactor, showPoints, pointColor, pointRadius, fillMissing)

      // 创建X轴标签
      if (showXLabels) {
        this.createXLabels(group, width, height, xLabelColor, xFont, xFontSize)
      }

      // 创建Y轴标签
      if (showYLabels) {
        this.createYLabels(group, width, height, yLabelColor, yFont, yFontSize, gridYCount)
      }

      // 强制组重新计算边界
      group.setCoords()

      // 添加到画布
      this.baseStore.canvas.add(group)
      
      // 确保位置正确设置
      group.set({
        left: config.left,
        top: config.top
      })
      group.setCoords()

      // 添加到图层
      this.layerStore.addLayer(group)

      // 渲染画布
      this.baseStore.canvas.renderAll()

      // 设置为当前选中对象
      this.baseStore.canvas.discardActiveObject()
      this.baseStore.canvas.setActiveObject(group)
    },

    createGrid(group, width, height, gridYCount, gridXCount, gridColor) {
      // 创建Y轴网格线
      const stepY = height / (gridYCount + 1)
      for (let i = 1; i <= gridYCount; i++) {
        const y = -height/2 + i * stepY
        const line = new Line([-width/2, y, width/2, y], {
          stroke: gridColor,
          strokeWidth: 1,
          selectable: false,
          hasControls: false
        })
        group.add(line)
      }

      // 创建X轴网格线
      const stepX = width / (gridXCount + 1)
      for (let i = 1; i <= gridXCount; i++) {
        const x = -width/2 + i * stepX
        const line = new Line([x, -height/2, x, height/2], {
          stroke: gridColor,
          strokeWidth: 1,
          selectable: false,
          hasControls: false
        })
        group.add(line)
      }
    },

    createAxis(group, width, height, axisColor) {
      // 创建X轴
      const xAxis = new Line([-width/2, height/2, width/2, height/2], {
        stroke: axisColor,
        strokeWidth: 1,
        selectable: false,
        hasControls: false
      })
      group.add(xAxis)

      // 创建Y轴
      const yAxis = new Line([-width/2, -height/2, -width/2, height/2], {
        stroke: axisColor,
        strokeWidth: 1,
        selectable: false,
        hasControls: false
      })
      group.add(yAxis)
    },

    createXLabels(group, width, height, xLabelColor, xFont, xFontSize) {
      const stepX = width / this.defaultGridXCount
      const today = new Date()
      for (let i = 0; i <= this.defaultGridXCount; i++) {
        const x = -width/2 + i * stepX
        const date = new Date(today)
        date.setDate(date.getDate() - (this.defaultGridXCount - i))
        const timeStr = this.formatTime(date, 'M/dd')
        const text = new Text(timeStr, {
          left: x - xFontSize,
          top: height/2 + 5,
          fontFamily: xFont || 'Arial',
          fontSize: xFontSize,
          fill: xLabelColor,
          selectable: false,
          hasControls: false,
          angle: 0
        })
        group.add(text)
      }
    },

    createYLabels(group, width, height, yLabelColor, yFont, yFontSize, gridYCount) {
      const stepY = height / gridYCount
      const valueRange = 16 // 22 - 6 = 16
      const minValue = 6
      for (let i = 0; i <= gridYCount; i++) {
        const y = -height/2 + i * stepY
        const value = Math.round(minValue + (gridYCount - i) * (valueRange / gridYCount))
        const text = new Text(`${value}`, {
          left: -width/2 - this.defaultYLabelWidth,
          top: y - yFontSize/2,
          fontFamily: yFont || 'Arial',
          fontSize: yFontSize,
          fill: yLabelColor,
          selectable: false,
          hasControls: false
        })
        group.add(text)
      }
    },

    formatTime(date, format) {
      const month = (date.getMonth() + 1).toString()
      const day = date.getDate().toString().padStart(2, '0')

      switch (format) {
        case 'M/dd':
          return `${month}/${day}`
        default:
          return `${month}/${day}`
      }
    },

    createLineChart(group, width, height, pointCount, color, lineWidth, smoothFactor, showPoints, pointColor, pointRadius, fillMissing) {
      const data = this.generateSampleData(pointCount)
      const stepX = width / (pointCount - 1)
      
      // 固定Y轴范围为6-22
      const minY = 6
      const maxY = 22
      const rangeY = maxY - minY

      // 创建折线路径
      const points = []
      for (let i = 0; i < pointCount; i++) {
        const value = i < data.length ? data[i] : null
        if (value !== null) {
          const x = -width/2 + i * stepX
          const y = -height/2 + ((value - minY) * height) / rangeY
          points.push({ x, y })
        }
      }

      // 创建折线（使用 Polyline 连接所有点）
      const polyline = new Polyline(points, {
        stroke: color,
        strokeWidth: lineWidth,
        fill: 'transparent',
        selectable: false,
        hasControls: false
      })
      group.add(polyline)

      // 创建数据点
      if (showPoints) {
        points.forEach(point => {
          const circle = new Circle({
            left: point.x,
            top: point.y,
            radius: pointRadius,
            fill: pointColor,
            selectable: false,
            hasControls: false
          })
          group.add(circle)
        })
      }
    },

    generateSampleData(count) {
      // 生成类似图片中的数据趋势
      const data = []
      let value = 17 // 起始值
      for (let i = 0; i < count; i++) {
        if (i < count / 3) {
          value += (Math.random() - 0.4) * 0.5 // 前1/3略微上升
        } else if (i < count * 2 / 3) {
          value += (Math.random() - 0.5) * 0.2 // 中间1/3相对平稳
        } else {
          value -= (Math.random() + 0.3) * 0.8 // 后1/3明显下降
        }
        data.push(Math.max(6, Math.min(22, value))) // 限制在6-22范围内
      }
      return data
    },

    calculatePoints(data, width, height) {
      const points = []
      const stepX = width / (data.length - 1)
      const minY = Math.min(...data.filter(v => v !== null))
      const maxY = Math.max(...data.filter(v => v !== null))
      const rangeY = maxY - minY

      data.forEach((value, index) => {
        if (value !== null) {
          const x = -width/2 + index * stepX
          const y = -height/2 + ((value - minY) * height) / rangeY
          points.push([x, y])
        } else {
          points.push(null)
        }
      })

      return points
    },

    createSmoothPath(points, smoothFactor) {
      const path = []
      let prevPoint = null

      points.forEach((point, index) => {
        if (point === null) {
          prevPoint = null
          return
        }

        if (prevPoint === null) {
          path.push(point)
        } else {
          const controlPoint1 = [
            prevPoint.x + (point.x - prevPoint.x) * smoothFactor,
            prevPoint.y
          ]
          const controlPoint2 = [
            point.x - (point.x - prevPoint.x) * smoothFactor,
            point.y
          ]
          path.push(controlPoint1, controlPoint2, point)
        }

        prevPoint = point
      })

      return path
    },

    updateElement(element, config) {
      if (!this.baseStore.canvas) return
      const group = this.baseStore.canvas.getObjects().find((obj) => obj.id === element.id)
      if (!group || !group.getObjects) return

      // 保存当前位置和大小
      const currentLeft = group.left
      const currentTop = group.top
      const currentWidth = group.width
      const currentHeight = group.height

      // 更新组的属性
      const updateProps = {
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
        chartProperty: config.chartProperty
      }

      // 过滤掉未定义的属性
      Object.keys(updateProps).forEach(key => {
        if (updateProps[key] !== undefined) {
          group.set(key, updateProps[key])
        }
      })

      // 重新创建所有元素
      group.remove(...group.getObjects())
      
      const width = currentWidth
      const height = currentHeight
      const pointCount = config.pointCount || group.pointCount || 240
      const color = config.color || group.color || this.defaultColors.color
      const bgColor = config.bgColor || group.bgColor || this.defaultColors.bgColor
      const lineWidth = config.lineWidth || group.lineWidth || this.defaultLineWidth
      const smoothFactor = config.smoothFactor || group.smoothFactor || this.defaultSmoothFactor
      const showPoints = config.showPoints !== undefined ? config.showPoints : group.showPoints !== undefined ? group.showPoints : true
      const pointColor = config.pointColor || group.pointColor || this.defaultColors.pointColor
      const pointRadius = config.pointRadius || group.pointRadius || this.defaultPointRadius
      const fillMissing = config.fillMissing !== undefined ? config.fillMissing : group.fillMissing !== undefined ? group.fillMissing : true

      // 创建背景
      const bgRect = new Rect({
        width: width,
        height: height,
        fill: bgColor,
        left: -width/2,
        top: -height/2,
        selectable: false,
        hasControls: false
      })
      group.add(bgRect)

      // 创建网格
      if (group.showGrid) {
        this.createGrid(group, width, height, group.gridYCount, group.gridXCount, group.gridColor)
      }

      // 创建坐标轴
      if (group.showAxis) {
        this.createAxis(group, width, height, group.axisColor)
      }

      // 创建折线图
      this.createLineChart(group, width, height, pointCount, color, lineWidth, smoothFactor, showPoints, pointColor, pointRadius, fillMissing)

      // 创建X轴标签
      if (group.showXLabels) {
        this.createXLabels(group, width, height, group.xLabelColor, group.xFont, group.xFontSize)
      }

      // 创建Y轴标签
      if (group.showYLabels) {
        this.createYLabels(group, width, height, group.yLabelColor, group.yFont, group.yFontSize, group.gridYCount)
      }

      // 恢复位置
      group.set({
        left: currentLeft,
        top: currentTop,
        width: currentWidth,
        height: currentHeight
      })
      // 强制重新计算边界和渲染
      group.setCoords()
      this.baseStore.canvas.renderAll()
    },

    encodeConfig(element) {
      if (!element) {
        throw new Error('无效的元素')
      }

      return {
        type: 'lineChart',
        x: Math.round(element.left),
        y: Math.round(element.top),
        width: Math.round(element.width),
        height: Math.round(element.height),
        color: element.color || this.defaultColors.color,
        bgColor: element.bgColor || this.defaultColors.bgColor,
        pointCount: element.pointCount || 240,
        fillMissing: element.fillMissing !== undefined ? element.fillMissing : true,
        lineWidth: element.lineWidth || this.defaultLineWidth,
        smoothFactor: element.smoothFactor || this.defaultSmoothFactor,
        showPoints: element.showPoints !== undefined ? element.showPoints : true,
        pointColor: element.pointColor || this.defaultColors.pointColor,
        pointRadius: element.pointRadius || this.defaultPointRadius,
        showGrid: element.showGrid !== undefined ? element.showGrid : true,
        gridColor: element.gridColor || this.defaultColors.gridColor,
        gridYCount: element.gridYCount || this.defaultGridYCount,
        gridXCount: element.gridXCount || this.defaultGridXCount,
        showAxis: element.showAxis !== undefined ? element.showAxis : true,
        axisColor: element.axisColor || this.defaultColors.axisColor,
        showXLabels: element.showXLabels !== undefined ? element.showXLabels : true,
        showYLabels: element.showYLabels !== undefined ? element.showYLabels : true,
        xLabelColor: element.xLabelColor || this.defaultColors.xLabelColor,
        yLabelColor: element.yLabelColor || this.defaultColors.yLabelColor,
        xFont: element.xFont,
        yFont: element.yFont,
        xFontSize: element.xFontSize || this.defaultXFontSize,
        yFontSize: element.yFontSize || this.defaultYFontSize,
        timeFormat: element.timeFormat || 'MM/dd',
        yLabelWidth: element.yLabelWidth || this.defaultYLabelWidth,
        xLabelHeight: element.xLabelHeight || this.defaultXLabelHeight,
        chartProperty: element.chartProperty
      }
    },

    decodeConfig(config) {
      return {
        eleType: 'lineChart',
        left: config.x,
        top: config.y,
        width: config.width,
        height: config.height,
        color: config.color || this.defaultColors.color,
        bgColor: config.bgColor || this.defaultColors.bgColor,
        pointCount: config.pointCount || 240,
        fillMissing: config.fillMissing !== undefined ? config.fillMissing : true,
        lineWidth: config.lineWidth || this.defaultLineWidth,
        smoothFactor: config.smoothFactor || this.defaultSmoothFactor,
        showPoints: config.showPoints !== undefined ? config.showPoints : true,
        pointColor: config.pointColor || this.defaultColors.pointColor,
        pointRadius: config.pointRadius || this.defaultPointRadius,
        showGrid: config.showGrid !== undefined ? config.showGrid : true,
        gridColor: config.gridColor || this.defaultColors.gridColor,
        gridYCount: config.gridYCount || this.defaultGridYCount,
        gridXCount: config.gridXCount || this.defaultGridXCount,
        showAxis: config.showAxis !== undefined ? config.showAxis : true,
        axisColor: config.axisColor || this.defaultColors.axisColor,
        showXLabels: config.showXLabels !== undefined ? config.showXLabels : true,
        showYLabels: config.showYLabels !== undefined ? config.showYLabels : true,
        xLabelColor: config.xLabelColor || this.defaultColors.xLabelColor,
        yLabelColor: config.yLabelColor || this.defaultColors.yLabelColor,
        xFont: config.xFont,
        yFont: config.yFont,
        xFontSize: config.xFontSize || this.defaultXFontSize,
        yFontSize: config.yFontSize || this.defaultYFontSize,
        timeFormat: config.timeFormat || 'MM/dd',
        yLabelWidth: config.yLabelWidth || this.defaultYLabelWidth,
        xLabelHeight: config.xLabelHeight || this.defaultXLabelHeight,
        chartProperty: config.chartProperty
      }
    }
  }
}) 
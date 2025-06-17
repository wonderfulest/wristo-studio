import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { Group, Line, Rect, Text } from 'fabric'
import { nanoid } from 'nanoid'

export const useBarChartStore = defineStore('barChartElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return {
      baseStore,
      layerStore,
      defaultColors: {
        color: '#ffffff',    // 线条颜色
        bgColor: '#000000',  // 背景颜色
        gridColor: '#555555', // 网格颜色
        xAxisColor: '#aaaaaa', // X轴颜色
        yAxisColor: '#aaaaaa', // Y轴颜色
        xLabelColor: '#ffffff', // X轴标签颜色
        yLabelColor: '#ffffff'  // Y轴标签颜色
      },
      defaultBarWidth: 1,     // 默认柱形宽度
      defaultGridYCount: 3,   // 默认Y轴网格数量
      defaultXFontSize: 12,   // 默认X轴标签大小
      defaultYFontSize: 12    // 默认Y轴标签大小
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
      const minY = config.minY
      const maxY = config.maxY

      // 样式配置
      const color = config.color || this.defaultColors.color
      const bgColor = config.bgColor || this.defaultColors.bgColor

      // 图表显示配置
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

      // 创建组
      const barWidth = config.barWidth || this.defaultBarWidth
      const group = new Group([], {
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
        // 新增的图表显示属性
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
        yFontSize: yFontSize
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
        this.createGrid(group, width, height, gridYCount, gridColor)
      }

      // 创建坐标轴
      if (showXAxis) {
        this.createXAxis(group, width, height, xAxisColor)
      }
      if (showYAxis) {
        this.createYAxis(group, width, height, yAxisColor)
      }

      // 创建X轴标签
      if (showXLabels) {
        this.createXLabels(group, width, height, xLabelColor, xFont, xFontSize)
      }

      // 创建柱状图
      this.createBars(group, width, height, pointCount, color, fillMissing)

      // 最后创建Y轴标签，确保显示在最上层
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

    createGrid(group, width, height, gridYCount, gridColor) {
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
    },

    createXAxis(group, width, height, xAxisColor) {
      const line = new Line([-width/2, height/2, width/2, height/2], {
        stroke: xAxisColor,
        strokeWidth: 1,
        selectable: false,
        hasControls: false
      })
      group.add(line)
    },

    createYAxis(group, width, height, yAxisColor) {
      const line = new Line([-width/2, -height/2, -width/2, height/2], {
        stroke: yAxisColor,
        strokeWidth: 1,
        selectable: false,
        hasControls: false
      })
      group.add(line)
    },

    createXLabels(group, width, height, xLabelColor, xFont, xFontSize) {
      const stepX = width / 4
      for (let i = 0; i <= 4; i++) {
        const x = -width/2 + i * stepX
        const text = new Text(`${i}`, {
          left: x,
          top: height/2 + 5,
          fontFamily: xFont,
          fontSize: xFontSize,
          fill: xLabelColor,
          selectable: false,
          hasControls: false
        })
        group.add(text)
      }
    },

    createYLabels(group, width, height, yLabelColor, yFont, yFontSize, gridYCount) {
      const stepY = height / (gridYCount + 1)
      for (let i = 0; i <= gridYCount + 1; i++) {
        const y = -height/2 + i * stepY
        const value = Math.round((1 - i / (gridYCount + 1)) * 100)
        const text = new Text(`${value}`, {
          left: -width/2 - yFontSize,
          top: y - 6,
          fontFamily: yFont,
          fontSize: yFontSize,
          fill: yLabelColor,
          selectable: false,
          hasControls: false
        })
        group.add(text)
      }
    },

    createBars(group, width, height, pointCount, color, fillMissing) {
      const stepX = width / pointCount
      const data = this.generateSampleData(pointCount)
      const barWidth = group.barWidth || this.defaultBarWidth

      // 计算数据范围
      const validData = data.filter(v => v !== null)
      const minY = Math.min(...validData) - 5
      const maxY = Math.max(...validData) + 5
      const rangeY = maxY - minY

      for (let i = 0; i < pointCount; i++) {
        const value = i < data.length ? data[i] : null
        const xPos = -width/2 + i * stepX

        if (value !== null) {
          const scaledY = ((value - minY) * (height - 2)) / rangeY
          const yTop = -height/2 + (height - scaledY)
          
          // 使用 Rect 替代 Line 来创建柱形
          const bar = new Rect({
            left: xPos - barWidth/2,
            top: yTop,
            width: barWidth,
            height: height/2 - yTop,
            fill: color,
            selectable: false,
            hasControls: false
          })
          group.add(bar)
        } else if (fillMissing) {
          // 缺失数据的柱形也使用相同宽度
          const missingBar = new Rect({
            left: xPos - barWidth/2,
            top: -height/2,
            width: barWidth,
            height: height,
            fill: '#666666',
            selectable: false,
            hasControls: false
          })
          group.add(missingBar)
        }
      }
    },

    generateSampleData(count) {
      const data = []
      for (let i = 0; i < count; i++) {
        if (Math.random() > 0.1) { // 90% 的概率有数据
          data.push(Math.random() * 100)
        } else {
          data.push(null)
        }
      }
      return data
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
        minY: config.minY,
        maxY: config.maxY,
        originX: config.originX,
        originY: config.originY,
        barWidth: config.barWidth,
        chartProperty: config.chartProperty,
        // 新增的图表显示属性
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
        yFontSize: config.yFontSize
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
      const fillMissing = config.fillMissing !== undefined ? config.fillMissing : group.fillMissing !== undefined ? group.fillMissing : true
      const barWidth = config.barWidth || group.barWidth || this.defaultBarWidth

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
        this.createGrid(group, width, height, group.gridYCount, group.gridColor)
      }

      // 创建坐标轴
      if (group.showXAxis) {
        this.createXAxis(group, width, height, group.xAxisColor)
      }
      if (group.showYAxis) {
        this.createYAxis(group, width, height, group.yAxisColor)
      }

      // 创建X轴标签
      if (group.showXLabels) {
        this.createXLabels(group, width, height, group.xLabelColor, group.xFont, group.xFontSize)
      }

      // 创建柱状图
      this.createBars(group, width, height, pointCount, color, fillMissing)

      // 最后创建Y轴标签，确保显示在最上层
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
        // 新增的图表显示属性
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
        yFontSize: element.yFontSize || this.defaultYFontSize
      }
    },

    decodeConfig(config) {
      return {
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
        // 新增的图表显示属性
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
        xFont: config.xFont || this.defaultXFont,
        yFont: config.yFont || this.defaultYFont,
        xFontSize: config.xFontSize || this.defaultXFontSize,
        yFontSize: config.yFontSize || this.defaultYFontSize
      }
    }
  }
}) 
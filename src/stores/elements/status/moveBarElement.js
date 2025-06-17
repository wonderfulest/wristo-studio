import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { Group, Polygon } from 'fabric'
import { nanoid } from 'nanoid'

export const useMoveBarStore = defineStore('moveBarElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return {
      baseStore,
      layerStore,
    }
  },

  actions: {
    addElement(config) {
      const id = nanoid()
      // 基础尺寸配置
      const width = config.width || 150 // 总宽度
      const height = config.height || 6 // 高度
      const separator = config.separator || 2 // 分隔符宽度
      const level = config.level || 3 // 活动级别

      // 样式配置
      const activeColor = config.activeColor || config.color || this.defaultColors.active
      const inactiveColor = config.inactiveColor || config.bgColor || this.defaultColors.inactive

      // 计算每个条形的宽度
      const barWidths = this.getBarWidth(width, separator)
      
      // 创建组
      const group = new Group([], {
        left: config.left,
        top: config.top,
        id,
        eleType: 'moveBar',
        selectable: true,
        hasControls: true,
        hasBorders: true,
        originX: 'center',
        originY: 'center',
        width: width,
        height: height,
        activeColor: activeColor,
        inactiveColor: inactiveColor,
        level: level,
        separator: separator
      })

      // 创建条形
      let barX = -width/2
      for (let i = 1; i <= 5; i++) {
        const isActive = i <= level
        const color = isActive ? activeColor : inactiveColor
        const currentBarWidth = i === 1 ? barWidths.firstBar : barWidths.normalBar
        const isFirstBar = i === 1

        const points = this.createBarPoints(barX, -height/2, currentBarWidth, height, isFirstBar)
        const bar = new Polygon(points, {
          fill: color,
          // stroke: '#666666',
          // strokeWidth: 1,
          id: id + '_bar_' + i,
          originX: 'center',
          originY: 'center',
          selectable: false,
          hasControls: false
        })

        group.add(bar)
        barX += currentBarWidth + separator
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

    // 计算每个条形的宽度
    getBarWidth(totalWidth, separator) {
      const numBars = 5 // 固定5个箭头
      const firstBarMultiplier = 2 // 第一个箭头是其他箭头的2倍宽
      const normalBarUnits = 4 // 4个普通宽度的箭头
      const totalUnits = firstBarMultiplier + normalBarUnits // 总单位数：6
      
      // 计算所有箭头的总宽度（不包括间距）
      const totalBarWidth = totalWidth - (numBars - 1) * separator
      // 计算单位宽度
      const normalBarWidth = totalBarWidth / totalUnits
      
      return {
        firstBar: normalBarWidth * firstBarMultiplier,
        normalBar: normalBarWidth
      }
    },

    // 创建箭头形状的点坐标
    createBarPoints(x, y, width, height, isFirstBar = false) {
      const tailIndent = width * 0.2 // 尾部凹进的深度占总宽度的20%
      return [
        { x: x, y: y }, // 左上
        { x: x + width - tailIndent, y: y }, // 箭头前上（第一个箭头调整比例）
        { x: x + width, y: y + height/2 }, // 箭头尖
        { x: x + width - tailIndent, y: y + height }, // 箭头前下（第一个箭头调整比例）
        { x: x, y: y + height }, // 左下
        { x: x + tailIndent, y: y + height/2 }, // 尾部凹进
      ]
    },

    // 更新活动级别
    updateLevel(element, level) {
      if (!this.baseStore.canvas) return
      const group = this.baseStore.canvas.getObjects().find((obj) => obj.id === element.id)
      if (!group || !group.getObjects) return

      const objects = group.getObjects()
      const activeColor = element.activeColor || this.defaultColors.active
      const inactiveColor = element.inactiveColor || this.defaultColors.inactive

      objects.forEach((obj) => {
        if (obj.id.startsWith(element.id + '_bar_')) {
          const barIndex = parseInt(obj.id.split('_').pop())
          obj.set('fill', barIndex <= level ? activeColor : inactiveColor)
        }
      })

      this.baseStore.canvas.renderAll()
    },

    // 编码配置
    encodeConfig(element) {
      if (!element) {
        throw new Error('无效的元素')
      }

      const objects = element.getObjects()
      const firstBar = objects.find((obj) => obj.id.endsWith('_bar_1'))
      const secondBar = objects.find((obj) => obj.id.endsWith('_bar_2'))
      
      if (!firstBar || !secondBar) {
        throw new Error('无效的元素')
      }

      return {
        type: 'moveBar',
        x: Math.ceil(element.left),
        y: Math.ceil(element.top),
        width: Math.ceil(element.width),
        height: Math.ceil(element.height),
        separator: Math.ceil(element.separator),
        activeColor: element.activeColor || this.defaultColors.active,
        inactiveColor: element.inactiveColor || this.defaultColors.inactive,
        level: element.level || 0
      }
    },

    // 解码配置
    decodeConfig(config) {
      return {
        eleType: 'moveBar',
        left: config.x,
        top: config.y,
        width: config.width,
        height: config.height,
        separator: config.separator,
        activeColor: config.activeColor || this.defaultColors.active,
        inactiveColor: config.inactiveColor || this.defaultColors.inactive,
        level: config.level || 0
      }
    },

    // 更新元素所有属性
    updateElement(element, config) {
      if (!this.baseStore.canvas) return
      const group = this.baseStore.canvas.getObjects().find((obj) => obj.id === element.id)
      if (!group || !group.getObjects) return

      // 保存当前位置和尺寸
      const currentLeft = group.left
      const currentTop = group.top
      const currentWidth = group.width || config.width
      const currentHeight = group.height || config.height

      // 更新组的属性
      const updateProps = {
        activeColor: config.activeColor || config.color,
        inactiveColor: config.inactiveColor || config.bgColor,
        level: config.level,
        originX: config.originX,
        originY: config.originY,
        separator: config.separator
      }

      // 保持宽度和高度不变
      group.set({
        width: currentWidth,
        height: currentHeight,
        ...updateProps
      })

      // 重新创建所有条形
      group.remove(...group.getObjects())
      
      const separator = config.separator || 6
      const level = config.level || group.level || 0
      const activeColor = config.activeColor || config.color || group.activeColor || this.defaultColors.active
      const inactiveColor = config.inactiveColor || config.bgColor || group.inactiveColor || this.defaultColors.inactive

      const barWidths = this.getBarWidth(currentWidth, separator)
      let barX = -currentWidth/2

      for (let i = 1; i <= 5; i++) {
        const isActive = i <= level
        const color = isActive ? activeColor : inactiveColor
        const currentBarWidth = i === 1 ? barWidths.firstBar : barWidths.normalBar
        const isFirstBar = i === 1

        const points = this.createBarPoints(barX, -currentHeight/2, currentBarWidth, currentHeight, isFirstBar)
        const bar = new Polygon(points, {
          fill: color,
          // stroke: '#666666',
          // strokeWidth: 1,
          id: element.id + '_bar_' + i,
          originX: 'center',
          originY: 'center',
          selectable: false,
          hasControls: false
        })

        group.add(bar)
        barX += currentBarWidth + separator
      }

      // 恢复位置
      if (config.left === undefined) {
        group.set('left', currentLeft)
      }
      if (config.top === undefined) {
        group.set('top', currentTop)
      }

      group.set({
        left: config.left,
        top: config.top
      })
      // 强制重新计算边界和渲染
      group.setCoords()
      this.baseStore.canvas.renderAll()
    }
  }
}) 
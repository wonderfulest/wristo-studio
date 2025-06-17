import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { Circle, Group } from 'fabric'
import { nanoid } from 'nanoid'
  
export const useGoalArcStore = defineStore('goalArcElement', {
  state: () => ({
    baseStore: useBaseStore(),
    layerStore: useLayerStore(),
    elements: new Map(),
    progressMap: new Map()
  }),

  actions: {
    addElement(config) {
      const id = nanoid()
      const startAngle = config.startAngle
      const endAngle = config.endAngle
      const radius = config.radius
      const bgRadius = config.bgRadius || radius // 背景圆环半径，默认与前景色圆环相同
      const strokeWidth = config.strokeWidth
      const bgStrokeWidth = config.bgStrokeWidth || strokeWidth // 背景圆环线宽，默认与前景色圆环相同
      const color = config.color
      const bgColor = config.bgColor
      const counterClockwise = config.counterClockwise
      const progress = config.progress || 0

      // 创建背景圆环（完整圆环）
      const bgRing = new Circle({
        radius: bgRadius,
        fill: 'transparent',
        stroke: bgColor,
        strokeWidth: bgStrokeWidth,
        startAngle: startAngle,
        endAngle: endAngle,
        id: id + '_bg',
        originX: 'center',
        originY: 'center',
        counterClockwise: false
      })

      // 创建前景色圆环（进度圆环）
      const mainRing = new Circle({
        radius: radius,
        fill: 'transparent',
        stroke: color,
        strokeWidth: strokeWidth,
        startAngle: startAngle,
        endAngle: this.getProgressAngle(startAngle, endAngle, counterClockwise, progress),
        id: id + '_main',
        originX: 'center',
        originY: 'center',
        counterClockwise: counterClockwise
      })

      // 计算组的尺寸（取两个圆环中较大的尺寸）
      const size = Math.max(
        (radius + strokeWidth / 2) * 2,
        (bgRadius + bgStrokeWidth / 2) * 2
      )

      // 创建组
      const group = new Group([bgRing, mainRing], {
        left: config.left,
        top: config.top,
        width: size,
        height: size,
        id: id,
        eleType: 'goalArc',
        selectable: true,
        hasControls: true,
        hasBorders: true,
        originX: 'center',
        originY: 'center',
        goalProperty: config.goalProperty,
        startAngle: startAngle,
        endAngle: endAngle,
        counterClockwise: counterClockwise
      })

      // 强制组重新计算边界
      group.setCoords()

      // 添加到画布
      this.baseStore.canvas.add(group)

      // 添加到图层
      this.layerStore.addLayer(group)

      // 渲染画布
      this.baseStore.canvas.renderAll()

      // 设置为当前选中对象
      this.baseStore.canvas.discardActiveObject()
      this.baseStore.canvas.setActiveObject(group)

      // 保存到store
      this.elements.set(id, group)
      this.progressMap.set(id, progress)
    },

    /**
     * 计算进度角度
     * @param {*} startAngle 起始角度
     * @param {*} endAngle 结束角度
     * @param {*} counterClockwise 是否逆时针
     * @param {*} progress 进度（0-1）
     * @returns 进度角度
     */
    getProgressAngle(startAngle, endAngle, counterClockwise, progress) {
      // 确保角度在0-360范围内
      startAngle = ((startAngle % 360) + 360) % 360
      endAngle = ((endAngle % 360) + 360) % 360

      if (counterClockwise) {
        // 逆时针
        if (endAngle > startAngle) {
          endAngle -= 360
        }
        return startAngle + (endAngle - startAngle) * progress
      } else {
        // 顺时针
        if (endAngle < startAngle) {
          endAngle += 360
        }
        return startAngle + (endAngle - startAngle) * progress
      }
    },

    updateProgress(element, progress) {
      if (!this.baseStore.canvas) return
      const group = this.baseStore.canvas.getObjects().find((obj) => obj.id === element.id)
      if (!group || !group.getObjects) return

      const objects = group.getObjects()
      const mainRing = objects.find((obj) => obj.id === element.id + '_main')

      if (!mainRing) return

      const startAngle = element.startAngle
      const endAngle = element.endAngle
      const counterClockwise = element.counterClockwise
      const progressAngle = this.getProgressAngle(startAngle, endAngle, counterClockwise, progress)

      mainRing.set('endAngle', progressAngle)
      mainRing.set('counterClockwise', counterClockwise)
      this.baseStore.canvas.renderAll()

      this.progressMap.set(element.id, progress)
    },

    updateElement(element, options = {}) {
      if (!element || !element.getObjects) return

      const objects = element.getObjects()
      const mainRing = objects.find((obj) => obj.id === element.id + '_main')
      const bgRing = objects.find((obj) => obj.id === element.id + '_bg')
      
      if (!mainRing || !bgRing) return

      // 更新背景圆环
      const bgRingOptions = {
        radius: options.bgRadius || bgRing.radius,
        strokeWidth: options.bgStrokeWidth || bgRing.strokeWidth,
        stroke: options.bgColor || bgRing.stroke,
        startAngle: options.startAngle || bgRing.startAngle,
        endAngle: options.endAngle || bgRing.endAngle,
        counterClockwise: options.counterClockwise !== undefined ? options.counterClockwise : bgRing.counterClockwise
      }
      bgRing.set(bgRingOptions)

      // 更新前景色圆环
      const progress = options.progress !== undefined ? options.progress : this.progressMap.get(element.id)
      const progressAngle = this.getProgressAngle(
        options.startAngle || element.startAngle,
        options.endAngle || element.endAngle,
        options.counterClockwise !== undefined ? options.counterClockwise : element.counterClockwise,
        progress
      )

      const mainRingOptions = {
        radius: options.radius || mainRing.radius,
        strokeWidth: options.strokeWidth || mainRing.strokeWidth,
        stroke: options.color || mainRing.stroke,
        startAngle: options.startAngle || mainRing.startAngle,
        endAngle: progressAngle,
        counterClockwise: options.counterClockwise !== undefined ? options.counterClockwise : mainRing.counterClockwise
      }
      mainRing.set(mainRingOptions)

      // 更新组的属性
      const groupOptions = {
        left: options.left !== undefined ? options.left : element.left,
        top: options.top !== undefined ? options.top : element.top,
        startAngle: options.startAngle !== undefined ? options.startAngle : element.startAngle,
        endAngle: options.endAngle !== undefined ? options.endAngle : element.endAngle,
        counterClockwise: options.counterClockwise !== undefined ? options.counterClockwise : element.counterClockwise,
        goalProperty: options.goalProperty !== undefined ? options.goalProperty : element.goalProperty
      }
      element.set(groupOptions)

      // 计算组的新尺寸
      const size = Math.max(
        (mainRing.radius + mainRing.strokeWidth / 2) * 2,
        (bgRing.radius + bgRing.strokeWidth / 2) * 2
      )

      element.set({
        width: size,
        height: size
      })

      // 强制组重新计算边界
      element.setCoords()
      mainRing.setCoords()
      bgRing.setCoords()

      // 强制重新渲染
      this.baseStore.canvas.requestRenderAll()

      if (options.progress !== undefined) {
        this.progressMap.set(element.id, options.progress)
      }
    },

    encodeConfig(element) {
      const mainRing = element.getObjects().find((obj) => obj.id.endsWith('_main'))
      const bgRing = element.getObjects().find((obj) => obj.id.endsWith('_bg'))
      if (!mainRing || !bgRing) {
        throw new Error('无效的元素')
      }

      return {
        type: 'goalArc',
        x: Math.round(element.left),
        y: Math.round(element.top),
        startAngle: element.startAngle,
        endAngle: element.endAngle,
        radius: mainRing.radius,
        bgRadius: bgRing.radius,
        strokeWidth: mainRing.strokeWidth,
        bgStrokeWidth: bgRing.strokeWidth,
        color: mainRing.stroke,
        bgColor: bgRing.stroke,
        counterClockwise: element.counterClockwise,
        goalProperty: element.goalProperty,
        progress: this.progressMap.get(element.id)
      }
    },

    decodeConfig(config) {
      return {
        eleType: 'goalArc',
        left: config.x,
        top: config.y,
        startAngle: config.startAngle,
        endAngle: config.endAngle,
        radius: config.radius,
        bgRadius: config.bgRadius,
        strokeWidth: config.strokeWidth,
        bgStrokeWidth: config.bgStrokeWidth,
        color: config.color,
        bgColor: config.bgColor,
        counterClockwise: config.counterClockwise,
        goalProperty: config.goalProperty,
        progress: config.progress
      }
    }
  }
})

import { defineStore } from 'pinia'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { Group, Polygon } from 'fabric'
import { nanoid } from 'nanoid'
import type { MoveBarElementConfig } from '@/types/elements/status'
import { FabricElement } from '@/types/element'
import * as elementManager from '@/engine/managers/elementManager'

export const useMoveBarStore = defineStore('moveBarElement', {
  state: () => {
    const canvasStore = useCanvasStore()
    const layerStore = useLayerStore()
    return {
      canvas: canvasStore.canvas,
      layerStore,
      defaultColors: {
        active: '#00FF00',
        inactive: '#555555',
      } as { active: string; inactive: string },
    }
  },

  actions: {
    addElement(config: MoveBarElementConfig) {
      const id = nanoid()
      const width = config.width || 150
      const height = config.height || 6
      const separator = config.separator || 2
      const level = config.level || 3

      const activeColor = config.activeColor || config.color || (this as any).defaultColors.active
      const inactiveColor = config.inactiveColor || config.bgColor || (this as any).defaultColors.inactive

      const barWidths = this.getBarWidth(width, separator)

      const group: any = new Group([], {
        left: config.left,
        top: config.top,
        id,
        eleType: 'moveBar',
        selectable: true,
        hasControls: false,
        hasBorders: true,
        originX: 'center',
        originY: 'center',
        width: width,
        height: height,
        activeColor: activeColor,
        inactiveColor: inactiveColor,
        level: level,
        separator: separator,
      } as any)

      const bars: any[] = []
      let barX = -width / 2
      for (let i = 1; i <= 5; i++) {
        const isActive = i <= level
        const color = isActive ? activeColor : inactiveColor
        const currentBarWidth = i === 1 ? barWidths.firstBar : barWidths.normalBar
        const isFirstBar = i === 1
        const points = this.createBarPoints(barX, -height / 2, currentBarWidth, height, isFirstBar)
        const bar: any = new Polygon(points as any, {
          fill: color,
          id: id + '_bar_' + i,
          originX: 'center',
          originY: 'center',
          selectable: false,
          hasControls: false,
        } as any)
        group.add(bar)
        bars.push(bar)
        barX += currentBarWidth + separator
      }

      // 绑定结构化引用：整个条形数组，便于后续无需遍历 getObjects
      ;(group as any)._bars = bars

      group.setCoords()
      this.canvas?.add(group)

      group.set({ left: config.left, top: config.top })
      group.setCoords()

      this.layerStore.addLayer(group)
      // 注册到全局 ElementManager 的运行时 Registry 中
      elementManager.registerElementInstance(group as FabricElement)
      this.canvas?.requestRenderAll?.()
      this.canvas?.discardActiveObject()
      this.canvas?.setActiveObject(group)
      return group
    },

    getBarWidth(totalWidth: number, separator: number) {
      const numBars = 5
      const firstBarMultiplier = 2
      const normalBarUnits = 4
      const totalBarWidth = totalWidth - (numBars - 1) * separator
      const normalBarWidth = totalBarWidth / (firstBarMultiplier + normalBarUnits)
      return {
        firstBar: normalBarWidth * firstBarMultiplier,
        normalBar: normalBarWidth,
      }
    },

    createBarPoints(x: number, y: number, width: number, height: number, _isFirstBar = false) {
      const tailIndent = width * 0.2
      return [
        { x: x, y: y },
        { x: x + width - tailIndent, y: y },
        { x: x + width, y: y + height / 2 },
        { x: x + width - tailIndent, y: y + height },
        { x: x, y: y + height },
        { x: x + tailIndent, y: y + height / 2 },
      ]
    },

    updateLevel(element: any, level: number) {
      if (!this.canvas) return

      // 通过 ElementManager Registry 按 id 获取 Group
      const group = elementManager.getElementById((element as any).id) as any
      if (!group) return

      const bars: any[] = (group as any)._bars
      const activeColor = (element as any).activeColor || (this as any).defaultColors.active
      const inactiveColor = (element as any).inactiveColor || (this as any).defaultColors.inactive
      if (!bars || !Array.isArray(bars)) return

      bars.forEach((bar: any, index: number) => {
        const barIndex = index + 1
        bar.set('fill', barIndex <= level ? activeColor : inactiveColor)
      })

      this.canvas.requestRenderAll?.()
    },

    encodeConfig(element: any): MoveBarElementConfig {
      if (!element) {
        throw new Error('Invalid element')
      }

      const id = String((element as any).id ?? '')
      const originX = ((element as any).originX ?? 'center') as any
      const originY = ((element as any).originY ?? 'center') as any

      return {
        id,
        eleType: 'moveBar',
        left: Math.ceil((element as any).left ?? 0),
        top: Math.ceil((element as any).top ?? 0),
        originX,
        originY,
        width: Math.ceil((element as any).width ?? 0),
        height: Math.ceil((element as any).height ?? 0),
        separator: Math.ceil((element as any).separator ?? 0),
        level: (element as any).level ?? 0,
        activeColor: (element as any).activeColor || (this as any).defaultColors.active,
        inactiveColor: (element as any).inactiveColor || (this as any).defaultColors.inactive,
      }
    },

    decodeConfig(config: MoveBarElementConfig): Partial<FabricElement> {
      return {
        eleType: 'moveBar',
        left: config.left,
        top: config.top,
        width: config.width,
        height: config.height,
        separator: config.separator,
        level: config.level,
        activeColor: config.activeColor ?? config.color ?? (this as any).defaultColors.active,
        inactiveColor: config.inactiveColor ?? config.bgColor ?? (this as any).defaultColors.inactive,
        originX: config.originX,
        originY: config.originY,
      } as any
    },

    updateElement(element: any, config: any) {
      if (!this.canvas) return

      // 通过 Registry 获取 Group
      const group: any = elementManager.getElementById((element as any).id) as any
      if (!group) return

      const currentLeft = group.left
      const currentTop = group.top
      const currentWidth = (group as any).width || config.width
      const currentHeight = (group as any).height || config.height

      const updateProps: any = {
        activeColor: config.activeColor || config.color,
        inactiveColor: config.inactiveColor || config.bgColor,
        level: config.level,
        originX: config.originX,
        originY: config.originY,
        separator: config.separator,
      }

      group.set({ width: currentWidth, height: currentHeight, ...updateProps })

      // 先移除并重建内部条形元素
      const bars: any[] = (group as any)._bars
      if (bars && Array.isArray(bars)) {
        bars.forEach((bar: any) => group.remove(bar))
      }

      const separator = config.separator || 6
      const level = config.level || group.level || 0
      const activeColor = config.activeColor || config.color || group.activeColor || (this as any).defaultColors.active
      const inactiveColor = config.inactiveColor || config.bgColor || group.inactiveColor || (this as any).defaultColors.inactive

      const barWidths = this.getBarWidth(currentWidth, separator)
      const nextBars: any[] = []
      let barX = -currentWidth / 2
      for (let i = 1; i <= 5; i++) {
        const isActive = i <= level
        const color = isActive ? activeColor : inactiveColor
        const currentBarWidth = i === 1 ? barWidths.firstBar : barWidths.normalBar
        const isFirstBar = i === 1
        const points = this.createBarPoints(barX, -currentHeight / 2, currentBarWidth, currentHeight, isFirstBar)
        const bar: any = new Polygon(points as any, {
          fill: color,
          id: element.id + '_bar_' + i,
          originX: 'center',
          originY: 'center',
          selectable: false,
          hasControls: false,
        } as any)
        group.add(bar)
        barX += currentBarWidth + separator
      }

      if (config.left === undefined) {
        group.set('left', currentLeft)
      }
      if (config.top === undefined) {
        group.set('top', currentTop)
      }
      group.set({ left: config.left, top: config.top })

      // 重新绑定结构化引用
      ;(group as any)._bars = nextBars

      group.setCoords()
      this.canvas.requestRenderAll?.()
    },
  },
})

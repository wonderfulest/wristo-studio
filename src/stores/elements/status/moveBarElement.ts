import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { Group, Polygon } from 'fabric'
import { nanoid } from 'nanoid'
import type { MoveBarElementConfig } from '@/types/elements/status'

export const useMoveBarStore = defineStore('moveBarElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return {
      baseStore,
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
        hasControls: true,
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
        barX += currentBarWidth + separator
      }

      group.setCoords()
      this.baseStore.canvas?.add(group)

      group.set({ left: config.left, top: config.top })
      group.setCoords()

      this.layerStore.addLayer(group)
      this.baseStore.canvas?.renderAll()
      this.baseStore.canvas?.discardActiveObject()
      this.baseStore.canvas?.setActiveObject(group)
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
      if (!this.baseStore.canvas) return
      const group: any = this.baseStore.canvas.getObjects().find((obj: any) => (obj as any).id === element.id)
      if (!group || !group.getObjects) return
      const objects = group.getObjects()
      const activeColor = (element as any).activeColor || (this as any).defaultColors.active
      const inactiveColor = (element as any).inactiveColor || (this as any).defaultColors.inactive
      objects.forEach((obj: any) => {
        if ((obj as any).id.startsWith(element.id + '_bar_')) {
          const barIndex = parseInt((obj as any).id.split('_').pop() || '0')
          obj.set('fill', barIndex <= level ? activeColor : inactiveColor)
        }
      })
      this.baseStore.canvas.renderAll()
    },

    encodeConfig(element: any) {
      if (!element) {
        throw new Error('Invalid element')
      }
      const objects = element.getObjects()
      const firstBar: any = objects.find((obj: any) => (obj as any).id.endsWith('_bar_1'))
      const secondBar: any = objects.find((obj: any) => (obj as any).id.endsWith('_bar_2'))
      if (!firstBar || !secondBar) {
        throw new Error('Invalid element')
      }
      return {
        type: 'moveBar',
        x: Math.ceil(element.left),
        y: Math.ceil(element.top),
        width: Math.ceil(element.width),
        height: Math.ceil(element.height),
        separator: Math.ceil(element.separator),
        activeColor: (element as any).activeColor || (this as any).defaultColors.active,
        inactiveColor: (element as any).inactiveColor || (this as any).defaultColors.inactive,
        level: element.level || 0,
      }
    },

    decodeConfig(config: any): MoveBarElementConfig {
      return {
        eleType: 'moveBar' as any,
        left: config.x,
        top: config.y,
        width: config.width,
        height: config.height,
        separator: config.separator,
        activeColor: config.activeColor || (this as any).defaultColors.active,
        inactiveColor: config.inactiveColor || (this as any).defaultColors.inactive,
        level: config.level || 0,
      } as any
    },

    updateElement(element: any, config: any) {
      if (!this.baseStore.canvas) return
      const group: any = this.baseStore.canvas.getObjects().find((obj: any) => (obj as any).id === element.id)
      if (!group || !group.getObjects) return

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

      group.remove(...group.getObjects())

      const separator = config.separator || 6
      const level = config.level || group.level || 0
      const activeColor = config.activeColor || config.color || group.activeColor || (this as any).defaultColors.active
      const inactiveColor = config.inactiveColor || config.bgColor || group.inactiveColor || (this as any).defaultColors.inactive

      const barWidths = this.getBarWidth(currentWidth, separator)
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
      group.setCoords()
      this.baseStore.canvas.renderAll()
    },
  },
})

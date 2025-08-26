import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { Rect, Group } from 'fabric'
import { nanoid } from 'nanoid'
import { decodeColor } from '@/utils/colorUtils'
import type { BatteryElementConfig } from '@/types/elements/status'

export const useBatteryStore = defineStore('batteryElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return {
      baseStore,
      layerStore,
      defaultLevelColors: {
        low: '#ff0000',
        medium: '#ffaa00',
        high: '#00ff00',
      } as { low: string; medium: string; high: string },
    }
  },

  actions: {
    addElement(config: BatteryElementConfig) {
      const id = nanoid()

      const width = config.width || 28
      const height = config.height || 18
      const headWidth = Math.round(config.headWidth || width * 0.08)
      const headHeight = Math.round(config.headHeight || height * 0.5)
      const padding = Math.round(config.padding || 4)
      const level = config.level || 0.5
      const headGap = Math.round(config.headGap || 2)

      const bodyStrokeWidth = config.bodyStrokeWidth || 2
      const bodyStroke = config.bodyStroke || '#ffffff'
      const bodyFill = config.bodyFill || 'transparent'
      const bodyRx = config.bodyRx || height * 0.1
      const bodyRy = config.bodyRy || height * 0.1

      const headFill = config.headFill || bodyStroke
      const headRx = Math.round(config.headRx || headWidth * 0.2)
      const headRy = Math.round(config.headRy || headWidth * 0.2)

      const batteryBody: any = new Rect({
        width,
        height,
        fill: decodeColor(bodyFill),
        stroke: bodyStroke,
        strokeWidth: bodyStrokeWidth,
        rx: bodyRx,
        ry: bodyRy,
        id: id + '_body',
        originX: 'left',
        originY: 'center',
        left: -width / 2,
      })

      const batteryHead: any = new Rect({
        width: headWidth,
        height: headHeight,
        fill: headFill,
        rx: headRx,
        ry: headRy,
        id: id + '_head',
        originX: 'left',
        originY: 'center',
        left: width / 2 + headGap,
      })

      const batteryLevel: any = new Rect({
        width: (width - padding * 2) * level,
        height: height - padding * 2,
        fill: this.getLevelColor(level, config.levelColors),
        id: id + '_level',
        originX: 'left',
        originY: 'center',
        left: -width / 2 + padding,
      })

      const group: any = new Group(
        [batteryBody, batteryHead, batteryLevel],
        {
          left: config.left,
          top: config.top,
          id,
          eleType: 'battery',
          selectable: true,
          hasControls: true,
          hasBorders: true,
          originX: 'center',
          originY: 'center',
          padding,
          headGap,
          levelColors: config.levelColors || this.defaultLevelColors,
        } as any
      )

      group.setCoords()
      this.baseStore.canvas?.add(group)
      this.layerStore.addLayer(group)
      this.baseStore.canvas?.renderAll()
      this.baseStore.canvas?.discardActiveObject()
      this.baseStore.canvas?.setActiveObject(group)
    },

    getLevelColor(level: number, levelColors: { low: string; medium: string; high: string } | null = null) {
      const colors = levelColors || this.defaultLevelColors
      if (level <= 0.2) return colors.low
      if (level <= 0.5) return colors.medium
      return colors.high
    },

    updateLevel(element: any, level: number) {
      if (!this.baseStore.canvas) return
      const group: any = this.baseStore.canvas.getObjects().find((obj: any) => (obj as any).id === element.id)
      if (!group || !group.getObjects) return

      const objects = group.getObjects()
      const batteryLevel: any = objects.find((obj: any) => (obj as any).id === element.id + '_level')
      const batteryBody: any = objects.find((obj: any) => (obj as any).id === element.id + '_body')
      if (!batteryLevel || !batteryBody) return

      const padding = 5
      const w: number = (batteryBody as any).width
      batteryLevel.set({
        width: (w - padding * 2) * level,
        fill: this.getLevelColor(level),
      })
      this.baseStore.canvas.renderAll()
    },

    encodeConfig(element: any) {
      if (!element) {
        throw new Error('Invalid element')
      }
      const objects = element.getObjects()
      const batteryBody: any = objects.find((obj: any) => (obj as any).id.endsWith('_body'))
      const batteryHead: any = objects.find((obj: any) => (obj as any).id.endsWith('_head'))
      const batteryLevel: any = objects.find((obj: any) => (obj as any).id.endsWith('_level'))
      if (!batteryBody || !batteryHead || !batteryLevel) {
        throw new Error('Invalid element')
      }
      return {
        type: 'battery',
        x: Math.round(element.left),
        y: Math.round(element.top),
        width: Math.round(batteryBody.width),
        height: Math.round(batteryBody.height),
        bodyStroke: batteryBody.stroke,
        bodyFill: batteryBody.fill,
        bodyStrokeWidth: Math.round(batteryBody.strokeWidth),
        bodyRx: Math.round(batteryBody.rx),
        bodyRy: Math.round(batteryBody.ry),
        headWidth: Math.round(batteryHead.width),
        headHeight: Math.round(batteryHead.height),
        headFill: batteryHead.fill,
        headRx: Math.round(batteryHead.rx),
        headRy: Math.round(batteryHead.ry),
        padding: Math.round(element.padding),
        level: Number((batteryLevel.width / (batteryBody.width - element.padding * 2)).toFixed(2)),
        levelColors: element.levelColors || this.defaultLevelColors,
        headGap: Math.round(element.headGap) || 2,
      }
    },

    decodeConfig(config: any): BatteryElementConfig {
      return {
        eleType: 'battery' as any,
        left: config.x,
        top: config.y,
        width: config.width,
        height: config.height,
        bodyStroke: config.bodyStroke,
        bodyFill: config.bodyFill,
        bodyStrokeWidth: config.bodyStrokeWidth,
        bodyRx: config.bodyRx,
        bodyRy: config.bodyRy,
        headWidth: config.headWidth,
        headHeight: config.headHeight,
        headFill: config.headFill,
        headRx: config.headRx,
        headRy: config.headRy,
        padding: config.padding,
        level: config.level,
        levelColors: config.levelColors || this.defaultLevelColors,
        headGap: config.headGap || 2,
      } as any
    },

    updateElement(element: any, config: any) {
      if (!this.baseStore.canvas) return
      const group: any = this.baseStore.canvas.getObjects().find((obj: any) => (obj as any).id === element.id)
      if (!group || !group.getObjects) return

      const objects = group.getObjects()
      const batteryBody: any = objects.find((obj: any) => (obj as any).id.endsWith('_body'))
      const batteryHead: any = objects.find((obj: any) => (obj as any).id.endsWith('_head'))
      const batteryLevel: any = objects.find((obj: any) => (obj as any).id.endsWith('_level'))
      if (!batteryBody || !batteryHead || !batteryLevel) return

      batteryBody.set({
        width: config.width,
        height: config.height,
        fill: config.bodyFill,
        stroke: config.bodyStroke,
        strokeWidth: config.bodyStrokeWidth,
        rx: config.bodyRx,
        ry: config.bodyRy,
        originX: 'left',
        originY: 'center',
        left: -config.width / 2,
      })

      batteryHead.set({
        width: config.headWidth,
        height: config.headHeight,
        fill: config.headFill,
        rx: config.headRx,
        ry: config.headRy,
        originX: 'left',
        originY: 'center',
        left: config.width / 2 + (config.headGap || 2),
      })

      const padding = config.padding || 4
      batteryLevel.set({
        width: (config.width - padding * 2) * config.level,
        height: config.height - padding * 2,
        fill: this.getLevelColor(config.level, config.levelColors),
        originX: 'left',
        originY: 'center',
        left: -config.width / 2 + padding,
      })

      if (config.left !== undefined) group.set('left', config.left)
      if (config.top !== undefined) group.set('top', config.top)
      if (config.levelColors !== undefined) group.set('levelColors', config.levelColors)

      group.setCoords()
      this.baseStore.canvas.renderAll()
    },
  },
})

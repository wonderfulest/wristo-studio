import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { Rect, Group } from 'fabric'
import { nanoid } from 'nanoid'
import { decodeColor } from '@/utils/colorUtils'
import type { BatteryElementConfig } from '@/types/elements/battery'
import { FabricElement } from '@/types/element'

export const useBatteryStore = defineStore('batteryElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return {
      baseStore,
      layerStore,
      defaultLevelColorLow: '#ff0000' as string,
      defaultLevelColorMedium: '#ffaa00' as string,
      defaultLevelColorHigh: '#00ff00' as string,
    }
  },

  actions: {
    addElement(config: BatteryElementConfig) {
      const id = nanoid()
      const width = config.width || 28
      const height = config.height || 18
      const headWidth = Math.round(config.headWidth || width * 0.08)
      const headHeight = Math.round(config.headHeight || height * 0.5)
      const padding = Math.round(config.padding || 2)
      const level = config.level || 0.5
      const headGap = Math.round(config.headGap || 1)

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

      const colorLow = config.levelColorLow ?? this.defaultLevelColorLow
      const colorMedium = config.levelColorMedium ?? this.defaultLevelColorMedium
      const colorHigh = config.levelColorHigh ?? this.defaultLevelColorHigh

      const batteryLevel: any = new Rect({
        width: (width - padding * 2) * level,
        height: height - padding * 2,
        fill: this.getLevelColor(level, colorLow, colorMedium, colorHigh),
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
          hasControls: false,
          hasBorders: true,
          originX: 'center',
          originY: 'center',
          padding,
          headGap,
          levelColorLow: colorLow,
          levelColorMedium: colorMedium,
          levelColorHigh: colorHigh,
        } as any
      )

      group.setCoords()
      this.baseStore.canvas?.add(group)
      this.layerStore.addLayer(group)
      this.baseStore.canvas?.renderAll()
      this.baseStore.canvas?.discardActiveObject()
      this.baseStore.canvas?.setActiveObject(group)
      return group
    },

    getLevelColor(
      level: number,
      levelColorLow?: string | null,
      levelColorMedium?: string | null,
      levelColorHigh?: string | null,
    ) {
      const low = levelColorLow ?? this.defaultLevelColorLow
      const medium = levelColorMedium ?? this.defaultLevelColorMedium
      const high = levelColorHigh ?? this.defaultLevelColorHigh
      if (level <= 0.2) return low
      if (level <= 0.5) return medium
      return high
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

    encodeConfig(element: Partial<FabricElement>): BatteryElementConfig {
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
      const safePadding = Math.round(((element as any).padding ?? 4) as number)
      const config: BatteryElementConfig = {
        id: String((element as any).id ?? ''),
        eleType: 'battery',
        originX: ((element as any).originX ?? 'center') as any,
        originY: ((element as any).originY ?? 'center') as any,
        left: Math.round(((element as any).left ?? 0) as number),
        top: Math.round(((element as any).top ?? 0) as number),
        width: Math.round((batteryBody as any).width as number),
        height: Math.round((batteryBody as any).height as number),
        bodyStroke: (batteryBody as any).stroke,
        bodyFill: (batteryBody as any).fill,
        bodyStrokeWidth: Math.round(((batteryBody as any).strokeWidth ?? 0) as number),
        bodyRx: Math.round(((batteryBody as any).rx ?? 0) as number),
        bodyRy: Math.round(((batteryBody as any).ry ?? 0) as number),
        headWidth: Math.round((batteryHead as any).width as number),
        headHeight: Math.round((batteryHead as any).height as number),
        headFill: (batteryHead as any).fill,
        headRx: Math.round(((batteryHead as any).rx ?? 0) as number),
        headRy: Math.round(((batteryHead as any).ry ?? 0) as number),
        padding: safePadding,
        level: Number(((
          ((batteryLevel as any).width as number) /
          (((batteryBody as any).width as number) - safePadding * 2)
        ).toFixed(2))),
        levelColorLow: (((element as any).levelColorLow ?? (element as any).levelColorLow) ?? this.defaultLevelColorLow) as string,
        levelColorMedium: (((element as any).levelColorMedium ?? (element as any).levelColorMedium) ?? this.defaultLevelColorMedium) as string,
        levelColorHigh: (((element as any).levelColorHigh ?? (element as any).levelColorHigh) ?? this.defaultLevelColorHigh) as string,
        headGap: Math.round((((element as any).headGap ?? 2) as number)),
      }
      return config
    },

    decodeConfig(config: BatteryElementConfig): Partial<FabricElement> {
      const decoded: Partial<FabricElement> = {
        eleType: 'battery',
        left: config.left,
        top: config.top,
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
        levelColorLow: config.levelColorLow ?? this.defaultLevelColorLow,
        levelColorMedium: config.levelColorMedium ?? this.defaultLevelColorMedium,
        levelColorHigh: config.levelColorHigh ?? this.defaultLevelColorHigh,
        headGap: config.headGap || 2,
      } 
      return decoded
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
      const nextLow = (config.levelColorLow ?? (group as any).levelColorLow ?? this.defaultLevelColorLow) as string
      const nextMedium = (config.levelColorMedium ?? (group as any).levelColorMedium ?? this.defaultLevelColorMedium) as string
      const nextHigh = (config.levelColorHigh ?? (group as any).levelColorHigh ?? this.defaultLevelColorHigh) as string
      batteryLevel.set({
        width: (config.width - padding * 2) * config.level,
        height: config.height - padding * 2,
        fill: this.getLevelColor(config.level, nextLow, nextMedium, nextHigh),
        originX: 'left',
        originY: 'center',
        left: -config.width / 2 + padding,
      })

      if (config.left !== undefined) group.set('left', config.left)
      if (config.top !== undefined) group.set('top', config.top)
      if (config.levelColorLow !== undefined) (group as any).set('levelColorLow', nextLow)
      if (config.levelColorMedium !== undefined) (group as any).set('levelColorMedium', nextMedium)
      if (config.levelColorHigh !== undefined) (group as any).set('levelColorHigh', nextHigh)

      group.setCoords()
      this.baseStore.canvas.renderAll()
    },
  },
})

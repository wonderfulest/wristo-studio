import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { loadSVGFromURL, util, type FabricObject } from 'fabric'
import { nanoid } from 'nanoid'
import { HourHandOptions } from '@/config/settings'
import { HandElementConfig, RotationCenter } from '@/types/elements'
import type { FabricElement } from '@/types/element'

// Helper type to access private _objects in grouped SVGs
interface WithObjects {
  _objects?: FabricObject[]
}

export const useHourHandStore = defineStore('hourHandElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return {
      baseStore,
      layerStore,
      moveDx: 0,
      defaultColors: {
        color: '#FFFFFF',
        bgColor: 'transparent'
      },
      defaultAngle: 0,
      defaultTargetHeight: 180,
      defaultRotationCenter: { x: 227, y: 227 } as RotationCenter,
      updateTimer: null as number | null
    }
  },

  actions: {
    /**
     * Common rotation method for hands
     */
    rotateHand(svgGroup: FabricElement, angle: number) {
      const targetHeight = svgGroup.targetHeight
      const moveDy = svgGroup.moveDy || 0
      const rotationCenter: RotationCenter = svgGroup.rotationCenter || { x: 227, y: 227 }

      const radians = util.degreesToRadians(angle)
      const dx = 0
      const dy = -targetHeight / 2 + moveDy
      const rotatedX = dx * Math.cos(radians) - dy * Math.sin(radians)
      const rotatedY = dx * Math.sin(radians) + dy * Math.cos(radians)
      svgGroup.set({
        left: rotationCenter.x + rotatedX,
        top: rotationCenter.y + rotatedY,
        angle: angle,
        originX: 'center',
        originY: 'center',
        scaleX: svgGroup.targetScaleX,
        scaleY: svgGroup.targetScaleY
      })
      svgGroup.setCoords()
      this.baseStore.canvas?.requestRenderAll()
    },

    getHourHandAngle(time?: Date) {
      const now = time || new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()
      const angle = (hours % 12) * 30 + minutes * 0.5
      return angle
    },

    async addElement(config: HandElementConfig) {
      const id = config.id || nanoid()
      const imageUrl = config.imageUrl || HourHandOptions[0].url
      const fill = config.fill || this.defaultColors.color
      const rotationCenter = config.rotationCenter || this.defaultRotationCenter
      const targetHeight = Math.min(config.targetHeight || this.defaultTargetHeight, 300)
      const moveDy = config.moveDy || 0
      const loadedSVG = await loadSVGFromURL(imageUrl)
      const groupedObjects = (loadedSVG.objects ?? []).filter((o): o is FabricObject => o != null)
      const svgGroup = util.groupSVGElements(groupedObjects) as unknown as FabricElement & WithObjects
      const options = {
        id,
        eleType: 'hourHand',
        originX: 'center',
        originY: 'center',
        selectable: true,
        hasControls: true,
        hasBorders: true,
        angle: 0,
        imageUrl: imageUrl,
        fill: fill,
        rotationCenter: rotationCenter,
        targetHeight: targetHeight,
        targetScaleY: 1,
        moveDy: moveDy,
        left: config.left,
        top: config.top,
      }
      svgGroup.set(options)
      svgGroup.scaleToHeight(targetHeight)
      svgGroup.set({
        targetScaleX: svgGroup.scaleX,
        targetScaleY: svgGroup.scaleY
      })
      this.rotateHand(svgGroup, 0)

      if (Array.isArray(svgGroup._objects)) {
        svgGroup._objects.forEach((obj: FabricObject) => obj.set('fill', fill))
      } else if (svgGroup.type === 'path') {
        svgGroup.set('fill', fill)
      }

      // Movement event
      svgGroup.on('moving', (e: unknown) => {
        const y = (e as { transform: { target: FabricElement } }).transform.target.top
        const distance = y + svgGroup.targetHeight / 2 - rotationCenter.y
        svgGroup.set('moveDy', distance)
      })

      svgGroup.on('selected', () => {
        if (this.updateTimer) {
          this.stopTimeUpdate()
        }
        this.rotateHand(svgGroup, 0)
      })
      svgGroup.on('deselected', () => {
        if (!this.updateTimer) {
          this.startTimeUpdate()
        }
      })
      svgGroup.setCoords()
      this.baseStore.canvas?.add(svgGroup as unknown as FabricObject)
      this.layerStore.addLayer(svgGroup as FabricElement & { eleType: string })
      this.baseStore.canvas?.requestRenderAll()
      this.baseStore.canvas?.discardActiveObject()
      this.baseStore.canvas?.setActiveObject(svgGroup as unknown as FabricObject)
      return svgGroup as unknown as FabricElement
    },

    async updateHandSVG(element: FabricElement, config: HandElementConfig) {
      if (!this.baseStore.canvas) return
      let svgGroup = this.baseStore.canvas
        .getObjects()
        .find((obj: FabricObject) => (obj as FabricElement).id === element.id) as (FabricElement & WithObjects) | undefined
      if (!svgGroup) return
      const rotationCenter = config.rotationCenter || svgGroup.rotationCenter || this.defaultRotationCenter
      const targetHeight = config.targetHeight || svgGroup.targetHeight || this.defaultTargetHeight
      const moveDy = config.moveDy || svgGroup.moveDy || 0
      if (config.imageUrl && config.imageUrl !== svgGroup.imageUrl) {
        this.baseStore.canvas.remove(svgGroup as unknown as FabricObject)
        const loadedSVG = await loadSVGFromURL(config.imageUrl)
        const groupedObjects = (loadedSVG.objects ?? []).filter((o): o is FabricObject => o != null)
        svgGroup = util.groupSVGElements(groupedObjects) as unknown as FabricElement & WithObjects
        svgGroup.set({
          id: element.id,
          eleType: 'hourHand',
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
          imageUrl: config.imageUrl,
          fill: '#ffffff',
          rotationCenter: rotationCenter,
          targetHeight: targetHeight,
          moveDy: moveDy
        })
        svgGroup.on('moving', (e: unknown) => {
          if (!svgGroup) return
          const y = (e as { transform: { target: FabricElement } }).transform.target.top
          const distance = y + svgGroup.targetHeight / 2 - rotationCenter.y
          svgGroup.set('moveDy', distance)
        })
        svgGroup.on('selected', () => {
          if (this.updateTimer) {
            this.stopTimeUpdate()
          }
          if (!svgGroup) return
          this.rotateHand(svgGroup, 0)
        })
        svgGroup.on('deselected', () => {
          if (!this.updateTimer) {
            this.startTimeUpdate()
          }
        })
        if (!svgGroup) return
        this.baseStore.canvas.add(svgGroup as unknown as FabricObject)
      }
      const fillToSet = config.fill || this.defaultColors.color
      if (Array.isArray(svgGroup._objects)) {
        svgGroup._objects.forEach((obj: FabricObject) => obj.set('fill', fillToSet))
      } else if (svgGroup.type === 'path') {
        svgGroup.set('fill', fillToSet)
      }
      svgGroup.scaleToHeight(targetHeight)
      svgGroup.set({
        moveDy: moveDy,
        rotationCenter: rotationCenter,
        targetHeight: targetHeight,
        targetScaleX: svgGroup.scaleX,
        targetScaleY: svgGroup.scaleY
      })
      this.rotateHand(svgGroup, 0)
      svgGroup.setCoords()
      this.baseStore.canvas.requestRenderAll()
      this.baseStore.canvas.discardActiveObject()
      this.baseStore.canvas.setActiveObject(svgGroup as unknown as FabricObject)
    },

    updateHeight(element: FabricElement, height: number) {
      if (!this.baseStore.canvas) return
      const hourHand = this.baseStore.canvas
        .getObjects()
        .find((obj: FabricObject) => (obj as FabricElement).id === element.id) as FabricElement | undefined
      if (!hourHand) return
      hourHand.scaleToHeight(height)
      hourHand.set({
        targetHeight: height,
        targetScaleX: hourHand.scaleX,
        targetScaleY: hourHand.scaleY
      })
      hourHand.setCoords()
      this.baseStore.canvas.requestRenderAll()
    },
    updateRotationCenter(element: FabricElement, rotationCenter: RotationCenter) {
      if (!this.baseStore.canvas) return
      const hourHand = this.baseStore.canvas
        .getObjects()
        .find((obj: FabricObject) => (obj as FabricElement).id === element.id) as FabricElement | undefined
      if (!hourHand) return
      hourHand.set('rotationCenter', rotationCenter)
    },
    updateHandColor(element: FabricElement, color: string) {
      if (!this.baseStore.canvas) return
      const hourHand = this.baseStore.canvas
        .getObjects()
        .find((obj: FabricObject) => (obj as FabricElement).id === element.id) as (FabricElement & WithObjects) | undefined
      if (!hourHand) return

      hourHand.set('fill', color)
      if (Array.isArray(hourHand._objects)) {
        hourHand._objects.forEach((obj: FabricObject) => {
          obj.set('fill', color)
          obj.set('stroke', color)
        })
      } else if (hourHand.type === 'path') {
        hourHand.set('fill', color)
        hourHand.set('stroke', color)
      }
      hourHand.setCoords()
      this.baseStore.canvas.requestRenderAll()
    },
    updateAngle(element: FabricElement, angle: number) {
      if (!this.baseStore.canvas) return
      const hourHand = this.baseStore.canvas
        .getObjects()
        .find((obj: FabricObject) => (obj as FabricElement).id === element.id) as FabricElement | undefined
      if (!hourHand) return
      this.rotateHand(hourHand, angle)
    },
    updateTime(time?: Date) {
      if (!this.baseStore.canvas) return
      const hourHand = this.baseStore.canvas
        .getObjects()
        .find((obj: FabricObject) => (obj as FabricElement).eleType === 'hourHand') as FabricElement | undefined
      if (!hourHand) return
      const angle = this.getHourHandAngle(time)
      this.rotateHand(hourHand, angle)
    },
    startTimeUpdate() {
      this.updateTime()
      this.updateTimer = window.setInterval(() => {
        this.updateTime()
      }, 3000)
    },
    stopTimeUpdate() {
      if (this.updateTimer) {
        clearInterval(this.updateTimer)
        this.updateTimer = null
      }
    },
    encodeConfig(element: FabricElement) {
      if (!element) throw new Error('Invalid element')
      return {
        id: String(element.id ?? ''),
        eleType: 'hourHand',
        left: element.left,
        top: element.top,
        // 无用属性
        originX: element.originX,
        originY: element.originY,
        // 有用属性
        height: element.height,
        fill: (element.fill ?? undefined) as unknown as string | undefined,
        angle: element.angle,
        imageUrl: element.imageUrl,
        targetHeight: element.targetHeight,
        rotationCenter: element.rotationCenter,
        moveDy: element.moveDy,
      }
    },
    decodeConfig(config: HandElementConfig) {
      return {
        id: config.id,
        eleType: 'hourHand',
        left: config.left,
        top: config.top,
        height: config.height,
        fill: config.fill,
        angle: config.angle,
        imageUrl: config.imageUrl,
        targetHeight: config.targetHeight,
        rotationCenter: config.rotationCenter,
        moveDy: config.moveDy,
      }
    }
  }
})

import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { loadSVGFromURL, util } from 'fabric'
import { nanoid } from 'nanoid'
import { SecondHandOptions } from '@/config/settings'

import type { HandElementConfig } from './hourHandElement'

export const useSecondHandStore = defineStore('secondHandElement', {
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
      defaultRotationCenter: { x: 227, y: 227 },
      updateTimer: null as any
    }
  },

  actions: {
    rotateHand(svgGroup: any, angle: number) {
      const targetHeight = svgGroup.targetHeight
      const moveDy = svgGroup.moveDy || 0
      const rotationCenter = svgGroup.rotationCenter || { x: 227, y: 227 }

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

    getSecondHandAngle(time?: Date) {
      const now = time || new Date()
      const seconds = now.getSeconds()
      const angle = seconds * 6
      return angle
    },

    async addElement(config: HandElementConfig) {
      const id = config.id || nanoid()
      const imageUrl = config.imageUrl || SecondHandOptions[0].url
      const fill = config.fill || this.defaultColors.color
      const rotationCenter = config.rotationCenter || this.defaultRotationCenter
      const targetHeight = Math.min(config.targetHeight || this.defaultTargetHeight, 300)
      const moveDy = config.moveDy || 0
      const loadedSVG: any = await loadSVGFromURL(imageUrl)
      const svgGroup: any = util.groupSVGElements(loadedSVG.objects)
      const options = {
        id,
        eleType: 'secondHand',
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
        svgGroup._objects.forEach((obj: any) => obj.set('fill', fill))
      } else if (svgGroup.type === 'path') {
        svgGroup.set('fill', fill)
      }

      svgGroup.on('moving', (e: any) => {
        const y = e.transform.target.top
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
      this.baseStore.canvas?.add(svgGroup)
      this.layerStore.addLayer(svgGroup)
      this.baseStore.canvas?.requestRenderAll()
      this.baseStore.canvas?.discardActiveObject()
      this.baseStore.canvas?.setActiveObject(svgGroup)
    },

    async updateHandSVG(element: any, config: HandElementConfig) {
      if (!this.baseStore.canvas) return
      let svgGroup: any = this.baseStore.canvas.getObjects().find((obj: any) => obj.id === element.id)
      if (!svgGroup) return
      const rotationCenter = config.rotationCenter || svgGroup.rotationCenter || this.defaultRotationCenter
      const targetHeight = config.targetHeight || svgGroup.targetHeight || this.defaultTargetHeight
      const moveDy = config.moveDy || svgGroup.moveDy || 0
      if (config.imageUrl && config.imageUrl !== svgGroup.imageUrl) {
        this.baseStore.canvas.remove(svgGroup)
        const loadedSVG: any = await loadSVGFromURL(config.imageUrl)
        svgGroup = util.groupSVGElements(loadedSVG.objects)
        svgGroup.set({
          id: element.id,
          eleType: 'secondHand',
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
        svgGroup.on('moving', (e: any) => {
          const y = e.transform.target.top
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
        this.baseStore.canvas.add(svgGroup)
      }
      const fillToSet = config.fill || this.defaultColors.color
      if (Array.isArray(svgGroup._objects)) {
        svgGroup._objects.forEach((obj: any) => obj.set('fill', fillToSet))
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
      this.baseStore.canvas.setActiveObject(svgGroup)
    },

    updateHeight(element: any, height: number) {
      if (!this.baseStore.canvas) return
      const secondHand: any = this.baseStore.canvas.getObjects().find((obj: any) => obj.id === element.id)
      if (!secondHand) return
      secondHand.scaleToHeight(height)
      secondHand.set({
        targetHeight: height,
        targetScaleX: secondHand.scaleX,
        targetScaleY: secondHand.scaleY
      })
      secondHand.setCoords()
      this.baseStore.canvas.requestRenderAll()
    },
    updateRotationCenter(element: any, rotationCenter: { x: number; y: number }) {
      if (!this.baseStore.canvas) return
      const secondHand: any = this.baseStore.canvas.getObjects().find((obj: any) => obj.id === element.id)
      if (!secondHand) return
      secondHand.set('rotationCenter', rotationCenter)
    },
    updateHandColor(element: any, color: string) {
      if (!this.baseStore.canvas) return
      const secondHand: any = this.baseStore.canvas.getObjects().find((obj: any) => obj.id === element.id)
      if (!secondHand) return

      secondHand.set('fill', color)
      if (Array.isArray(secondHand._objects)) {
        secondHand._objects.forEach((obj: any) => {
          obj.set('fill', color)
          obj.set('stroke', color)
        })
      } else if (secondHand.type === 'path') {
        secondHand.set('fill', color)
        secondHand.set('stroke', color)
      }
      secondHand.setCoords()
      this.baseStore.canvas.requestRenderAll()
    },
    updateAngle(element: any, angle: number) {
      if (!this.baseStore.canvas) return
      const secondHand: any = this.baseStore.canvas.getObjects().find((obj: any) => obj.id === element.id)
      if (!secondHand) return
      this.rotateHand(secondHand, angle)
    },
    updateTime(time?: Date) {
      if (!this.baseStore.canvas) return
      const secondHand: any = this.baseStore.canvas.getObjects().find((obj: any) => obj.eleType === 'secondHand')
      if (!secondHand) return
      const angle = this.getSecondHandAngle(time)
      this.rotateHand(secondHand, angle)
    },
    startTimeUpdate() {
      this.updateTime()
      this.updateTimer = setInterval(() => {
        this.updateTime()
      }, 1000)
    },
    stopTimeUpdate() {
      if (this.updateTimer) {
        clearInterval(this.updateTimer)
        this.updateTimer = null
      }
    },
    encodeConfig(element: any) {
      if (!element) throw new Error('Invalid element')
      return {
        id: element.id,
        type: 'secondHand',
        x: element.left,
        y: element.top,
        height: element.height,
        color: element.fill,
        angle: element.angle,
        imageUrl: element.imageUrl,
        targetHeight: element.targetHeight,
        rotationCenter: element.rotationCenter,
        moveDy: element.moveDy,
      }
    },
    decodeConfig(config: any) {
      return {
        id: config.id,
        eleType: 'secondHand',
        left: config.x,
        top: config.y,
        height: config.height,
        fill: config.color,
        angle: config.angle,
        imageUrl: config.imageUrl,
        targetHeight: config.targetHeight,
        rotationCenter: config.rotationCenter,
        moveDy: config.moveDy,
      }
    }
  }
})

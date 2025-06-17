import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { loadSVGFromURL, util } from 'fabric'
import { nanoid } from 'nanoid'
import { MinuteHandOptions } from '@/config/settings'
export const useMinuteHandStore = defineStore('minuteHandElement', {
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
      updateTimer: null
    }
  },

  actions: {
    /**
     * 通用的旋转方法
     * @param {Object} svgGroup - 需要旋转的元素
     * @param {number} angle - 旋转角度
     */
    rotateHand(svgGroup, angle) {
      const targetHeight = svgGroup.targetHeight // 指针高度
      const moveDy = svgGroup.moveDy || 0 // 旋转中心在Y轴上偏移的距离
      const rotationCenter = svgGroup.rotationCenter || {x: 227, y: 227} // 旋转中心; 默认是表盘中心

      const radians = util.degreesToRadians(angle)
      const dx = 0 // 指针在X轴上偏移的距离
      const dy = -targetHeight / 2 + moveDy // 指针在Y轴上偏移的距离
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
      this.baseStore.canvas.requestRenderAll()
    },

    getMinuteHandAngle(time) {
      const now = time || new Date()
      const minutes = now.getMinutes()
      const angle = minutes * 6
      return angle
    },

    async addElement(config) {
      console.log('minuteHand addElement', config)
      const id = config.id || nanoid()
      const imageUrl = config.imageUrl || MinuteHandOptions[0].url
      const fill = config.fill || this.defaultColors.color
      const rotationCenter = config.rotationCenter || this.defaultRotationCenter
      const targetHeight = Math.min(config.targetHeight || this.defaultTargetHeight, 300)
      const moveDy = config.moveDy || 0
      const loadedSVG = await loadSVGFromURL(imageUrl)
      const svgGroup = util.groupSVGElements(loadedSVG.objects)
      const options = {
        id,
        eleType: 'minuteHand',
        originX: 'center',
        originY: 'center',
        selectable: true,
        hasControls: true,
        hasBorders: true,
        angle: 0,
        imageUrl: imageUrl,
        fill: fill,
        rotationCenter: rotationCenter, // 旋转中心
        targetHeight: targetHeight, // 指针高度
        targetScaleY: 1, // 缩放比例
        moveDy: moveDy, // 旋转中心在Y轴上偏移的距离
      }
      svgGroup.set(options)
      svgGroup.scaleToHeight(targetHeight)
      svgGroup.set({
        targetScaleX: svgGroup.scaleX,
        targetScaleY: svgGroup.scaleY
      })
      this.rotateHand(svgGroup, 0)

      if (Array.isArray(svgGroup._objects)) {
        svgGroup._objects.forEach((obj) => obj.set('fill', fill))
      } else if (svgGroup.type === 'path') {
        svgGroup.set('fill', fill)
      }
    
      // 添加移动事件监听
      svgGroup.on('moving', (e) => {
        const y = e.transform.target.top // 获取指针中心位置的Y轴坐标
        const distance = y + svgGroup.targetHeight / 2 - rotationCenter.y
        svgGroup.set('moveDy', distance)
      })
      
      svgGroup.on('selected', (e) => {
        if (this.updateTimer) {
          this.stopTimeUpdate()
        }
        this.rotateHand(svgGroup, 0)
      })
      svgGroup.on('deselected', (e) => {
        if (!this.updateTimer) {
          this.startTimeUpdate()
        }
      })
      svgGroup.setCoords()
      this.baseStore.canvas.add(svgGroup)
      this.layerStore.addLayer(svgGroup)
      this.baseStore.canvas.requestRenderAll()
      this.baseStore.canvas.discardActiveObject()
      this.baseStore.canvas.setActiveObject(svgGroup)
    },
    async updateHandSVG(element, config) {
      if (!this.baseStore.canvas) return
      let svgGroup = this.baseStore.canvas.getObjects().find((obj) => obj.id === element.id)
      if (!svgGroup) return
      // 获取旋转中心、指针高度、旋转中心在Y轴上偏移的距离
      const rotationCenter = config.rotationCenter || svgGroup.rotationCenter || this.defaultRotationCenter
      const targetHeight = config.targetHeight || svgGroup.targetHeight || this.defaultTargetHeight
      const moveDy = config.moveDy || svgGroup.moveDy || 0
      if (config.imageUrl && config.imageUrl !== svgGroup.imageUrl) {
        this.baseStore.canvas.remove(svgGroup)
        const loadedSVG = await loadSVGFromURL(config.imageUrl)
        svgGroup = util.groupSVGElements(loadedSVG.objects)
        svgGroup.set({
          id: element.id,
          eleType: 'minuteHand',
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
        // 添加移动事件监听
        svgGroup.on('moving', (e) => {
          const y = e.transform.target.top // 获取指针中心位置的Y轴坐标
          const distance = y + svgGroup.targetHeight / 2 - rotationCenter.y
          svgGroup.set('moveDy', distance)
        })
        svgGroup.on('selected', (e) => {
          if (this.updateTimer) {
            this.stopTimeUpdate()
          }
          this.rotateHand(svgGroup, 0)
        })
        svgGroup.on('deselected', (e) => {
          if (!this.updateTimer) {
            this.startTimeUpdate()
          }
        })
        // 添加到画布
        this.baseStore.canvas.add(svgGroup)
      }
      // 应用颜色
      const fillToSet = config.fill || this.defaultColors.color
      if (Array.isArray(svgGroup._objects)) {
        svgGroup._objects.forEach((obj) => obj.set('fill', fillToSet))
      } else if (svgGroup.type === 'path') {
        svgGroup.set('fill', fillToSet)
      }
      // 调整尺寸
      svgGroup.scaleToHeight(targetHeight)
      svgGroup.set({
        moveDy: moveDy,
        rotationCenter: rotationCenter,
        targetHeight: targetHeight,
        targetScaleX: svgGroup.scaleX,
        targetScaleY: svgGroup.scaleY
      })
      // 旋转
      this.rotateHand(svgGroup, 0)
      // 更新坐标
      svgGroup.setCoords()
      // 更新
      this.baseStore.canvas.requestRenderAll()
      this.baseStore.canvas.discardActiveObject()
      this.baseStore.canvas.setActiveObject(svgGroup)
    },

    updateHeight(element, height) {
      if (!this.baseStore.canvas) return
      const hourHand = this.baseStore.canvas.getObjects().find(obj => obj.id === element.id)
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
    updateRotationCenter(element, rotationCenter) {
      console.log('updateRotationCenter', element, rotationCenter)
      if (!this.baseStore.canvas) return
      const hourHand = this.baseStore.canvas.getObjects().find(obj => obj.id === element.id)
      if (!hourHand) return
      hourHand.set('rotationCenter', rotationCenter)
    },
    updateHandColor(element, color) {
      if (!this.baseStore.canvas) return
      const minuteHand = this.baseStore.canvas.getObjects().find(obj => obj.id === element.id)
      if (!minuteHand) return
      
      // 设置主对象的颜色
      minuteHand.set('fill', color)
      // 更新所有子元素的颜色
      if (Array.isArray(minuteHand._objects)) {
        minuteHand._objects.forEach((obj) => {
          obj.set('fill', color)
          obj.set('stroke', color)
        })
      } else if (minuteHand.type === 'path') {
        minuteHand.set('fill', color)
        minuteHand.set('stroke', color)
      }
      minuteHand.setCoords()
      this.baseStore.canvas.requestRenderAll()
    },
    updateAngle(element, angle) {
      if (!this.baseStore.canvas) return
      const hourHand = this.baseStore.canvas.getObjects().find(obj => obj.id === element.id)
      if (!hourHand) return
      this.rotateHand(hourHand, angle)
    },
    updateTime(time) {
      if (!this.baseStore.canvas) return
      const minuteHand = this.baseStore.canvas.getObjects().find(obj => obj.eleType === 'minuteHand') 
      if (!minuteHand) return
      const angle = this.getMinuteHandAngle(time)
      // 使用通用的旋转方法
      this.rotateHand(minuteHand, angle)
    },
    startTimeUpdate() {
      // 先执行一次更新
      this.updateTime()
      
      // 每3秒更新一次
      this.updateTimer = setInterval(() => {
        this.updateTime()
      }, 3000)
    },

    stopTimeUpdate() {
      if (this.updateTimer) {
        clearInterval(this.updateTimer)
        this.updateTimer = null
      }
    },

    encodeConfig(element) {
      if (!element) throw new Error('无效的元素')
      return {
        id: element.id,
        type: 'minuteHand',
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

    decodeConfig(config) {
      return {
        id: config.id,
        eleType: 'minuteHand',
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

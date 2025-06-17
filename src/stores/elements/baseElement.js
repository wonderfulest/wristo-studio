import { defineStore } from 'pinia'
import { useBaseStore } from '../baseStore'
import { useLayerStore } from '../layerStore'
import { getFontSizeByStep } from '@/config/settings'
import { ActiveSelection } from 'fabric'
import { nanoid } from 'nanoid'
import emitter from '@/utils/eventBus'

export const useBaseElementStore = defineStore('baseElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    let _clipboard = null
    return {
      baseStore,
      layerStore,
      _clipboard
    }
  },

  actions: {
    // 更新元素属性
    updateElement(element) {
      if (!element || !this.baseStore.canvas) return

      const fabricObject = this.baseStore.canvas.getObjects().find((obj) => obj.id === element.id)

      if (!fabricObject) return

      // 更新元素位置
      if (element.x !== undefined) fabricObject.set('left', element.x)
      if (element.y !== undefined) fabricObject.set('top', element.y)

      // 更新文本属性
      if (element.fontSize !== undefined) fabricObject.set('fontSize', element.fontSize)
      if (element.fill !== undefined) fabricObject.set('fill', element.fill)
      if (element.fontFamily !== undefined) fabricObject.set('fontFamily', element.fontFamily)
      if (element.text !== undefined) fabricObject.set('text', element.text)

      // 更新其他通用属性
      if (element.angle !== undefined) fabricObject.set('angle', element.angle)
      if (element.scaleX !== undefined) fabricObject.set('scaleX', element.scaleX)
      if (element.scaleY !== undefined) fabricObject.set('scaleY', element.scaleY)

      // 更新控制点位置
      fabricObject.setCoords()

      this.baseStore.canvas.renderAll()
    },

    moveElement(direction, step = 1) {
      const selectedElements = this.baseStore.canvas.getActiveObjects()

      if (!selectedElements) return
      for (const element of selectedElements) {
        const currentX = element.left
        const currentY = element.top
        switch (direction) {
          case 'left':
            this.updateElement({ ...element, x: currentX - step })
            break
          case 'right':
            this.updateElement({ ...element, x: currentX + step })
            break
          case 'up':
            this.updateElement({ ...element, y: currentY - step })
            break
          case 'down':
            this.updateElement({ ...element, y: currentY + step })
            break
        }
      }
    },

    // 复制选中的元素
    async copySelectedElements() {
      if (!this.baseStore.canvas) return
      const activeObject = this.baseStore.canvas.getActiveObject()
      if (!activeObject) {
        return
      }
      const clonedObject = await activeObject.clone()
      this._clipboard = clonedObject
      // 存储到剪贴板
      localStorage.setItem('watchface-clipboard', JSON.stringify(this._clipboard))
    },

    // 粘贴之前复制的元素
    async pasteElements() {
      const canvas = this.baseStore.canvas
      if (!canvas) return
      if (!this._clipboard) return
      // clone again, so you can do multiple copies.
      const clonedObj = await this._clipboard.clone()
      canvas.discardActiveObject()
      clonedObj.set({
        left: clonedObj.left + 30,
        top: clonedObj.top + 30,
        evented: true
      })
      for (const obj of clonedObj._objects) {
        const changed = {
          id: nanoid(),
          eleType: obj.eleType
        }
        obj.set(changed)
      }
      if (clonedObj instanceof ActiveSelection) {
        // active selection needs a reference to the canvas.
        clonedObj.canvas = canvas
        clonedObj.forEachObject((obj) => {
          canvas.add(obj)
        })
        // this should solve the unselectability
        clonedObj.setCoords()
      } else {
        canvas.add(clonedObj)
      }
      this._clipboard.top += 20
      this._clipboard.left += 20

      // 添加到图层
      this.layerStore.addLayer(clonedObj)
      // 设置区同步
      emitter.emit('refresh-canvas')

      canvas.setActiveObject(clonedObj)
      canvas.requestRenderAll()
    },

    changeFontSize(increment) {
      const selectedElements = this.baseStore.canvas.getActiveObjects()
      if (!selectedElements) return

      for (const element of selectedElements) {
        if (element.type === 'text' || element.type === 'i-text') {
          const currentSize = element.fontSize
          const newSize = getFontSizeByStep(currentSize, increment)
          // 更新字体大小
          this.updateElement({ ...element, fontSize: newSize })
        }
      }
    }
  }
})

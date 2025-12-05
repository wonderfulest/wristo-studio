import { defineStore } from 'pinia'
import { useBaseStore } from '../baseStore'
import { useLayerStore } from '../layerStore'
import { getFontSizeByStep } from '@/config/settings'
import { ActiveSelection } from 'fabric'
import { nanoid } from 'nanoid'
import emitter from '@/utils/eventBus'
import { ElMessage } from 'element-plus'

// Minimal typings to keep flexibility with Fabric objects
interface ElementUpdate {
  id?: string
  x?: number
  y?: number
  fontSize?: number
  fill?: string
  fontFamily?: string
  text?: string
  angle?: number
  scaleX?: number
  scaleY?: number
  [key: string]: any
}

export const useBaseElementStore = defineStore('baseElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    let _clipboard: any = null
    return {
      baseStore,
      layerStore,
      _clipboard,
    }
  },

  actions: {
    // 更新元素属性
    updateElement(element: ElementUpdate): void {
      if (!element || !this.baseStore.canvas) return

      const fabricObject = this.baseStore.canvas.getObjects().find((obj: any) => obj.id === element.id)

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
      fabricObject.setCoords?.()

      this.baseStore.canvas.renderAll()
    },

    moveElement(direction: 'left' | 'right' | 'up' | 'down', step: number = 1): void {
      const selectedElements: any[] = this.baseStore.canvas?.getActiveObjects()

      if (!selectedElements) return
      for (const element of selectedElements) {
        const currentX = element.left
        const currentY = element.top
        switch (direction) {
          case 'left':
            this.updateElement({ ...element, id: element.id, x: currentX - step })
            break
          case 'right':
            this.updateElement({ ...element, id: element.id, x: currentX + step })
            break
          case 'up':
            this.updateElement({ ...element, id: element.id, y: currentY - step })
            break
          case 'down':
            this.updateElement({ ...element, id: element.id, y: currentY + step })
            break
        }
      }
    },

    // 复制选中的元素
    async copySelectedElements(): Promise<void> {
      if (!this.baseStore.canvas) return
      const activeObject: any = this.baseStore.canvas.getActiveObject()
      if (!activeObject) {
        return
      }
      // 不支持 Line 元素的复制
      if (activeObject.eleType === 'line') {
        ElMessage?.warning?.('直线元素不支持复制，请使用新增按钮创建新的直线')
        return
      }
      const clonedObject = await activeObject.clone()
      this._clipboard = clonedObject
      // 存储到剪贴板
      localStorage.setItem('watchface-clipboard', JSON.stringify(this._clipboard))
    },

    // 粘贴之前复制的元素
    async pasteElements(): Promise<void> {
      const canvas: any = this.baseStore.canvas
      if (!canvas) return
      if (!this._clipboard) return
      // 不支持 Line 元素的粘贴
      if (this._clipboard.eleType === 'line') {
        return
      }
      // clone again, so you can do multiple copies.
      const clonedObj: any = await this._clipboard.clone()
      // 清除旧选择
      canvas.discardActiveObject()
      clonedObj.set({
        left: clonedObj.left + 30,
        top: clonedObj.top + 30,
        evented: true,
      })
      // 为克隆对象分配新 id（无论是组还是单个）
      if (clonedObj._objects && Array.isArray(clonedObj._objects)) {
        for (const obj of clonedObj._objects) {
          obj.set({ id: nanoid() })
        }
      } else {
        clonedObj.set({ id: nanoid() })
      }
      if (clonedObj instanceof ActiveSelection) {
        // active selection needs a reference to the canvas.
        clonedObj.canvas = canvas
        clonedObj.forEachObject((obj: any) => {
          canvas.add(obj)
          // 同步到图层
          this.layerStore.addLayer(obj as any)
        })
        // this should solve the unselectability
        clonedObj.setCoords?.()
      } else {
        canvas.add(clonedObj)
        // 同步到图层
        this.layerStore.addLayer(clonedObj as any)
      }
      this._clipboard.top += 20
      this._clipboard.left += 20

      // 设置区同步
      emitter.emit('refresh-canvas')

      // 仅将新对象设为激活，并同步图层选中
      canvas.setActiveObject(clonedObj)
      if (clonedObj._objects && Array.isArray(clonedObj._objects)) {
        // 如果是多对象粘贴，默认选中整个分组的第一个对象的 id，或保持分组对象被选中（无 id）
        const first = clonedObj._objects[0]
        if (first && first.id) {
          this.layerStore.selectOne(first.id)
        } else {
          this.layerStore.clearSelected()
        }
      } else if (clonedObj.id) {
        this.layerStore.selectOne(clonedObj.id)
      } else {
        this.layerStore.clearSelected()
      }
      canvas.requestRenderAll()
    },

    changeFontSize(increment: number): void {
      const selectedElements: any[] = this.baseStore.canvas?.getActiveObjects()
      if (!selectedElements) return

      for (const element of selectedElements) {
        if (element.type === 'text' || element.type === 'i-text') {
          const currentSize = element.fontSize
          const newSize = getFontSizeByStep(currentSize, increment)
          // 更新字体大小
          this.updateElement({ ...element, id: element.id, fontSize: newSize })
        }
      }
    },
  },
})

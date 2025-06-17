import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { FabricText } from 'fabric'

export const useBluetoothStore = defineStore('bluetoothElement', {
  state: () => ({
    elements: []
  }),

  actions: {
    // 添加蓝牙指示器元素
    addElement(config = {}) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) return

      const options = {
        eleType: 'bluetooth',
        left: config.left,
        top: config.top,
        fontSize: config.fontSize,
        fontFamily: config.fontFamily,
        fill: config.fill,
        selectable: true,
        evented: true,
        originX: 'center',
        originY: 'center'
      }

      // 创建蓝牙图标
      const bluetoothIcon = new FabricText('\u0022', options)

      // 设置蓝牙图标
      bluetoothIcon.set('text', '\u0022')
      
      // 添加到画布
      baseStore.canvas.add(bluetoothIcon)
      baseStore.canvas.setActiveObject(bluetoothIcon)
      
      // 保存到状态中
      this.elements.push(bluetoothIcon)
      
      // 渲染画布
      baseStore.canvas.renderAll()
    },

    // 更新蓝牙状态
    updateBluetoothStatus(status) {
      const baseStore = useBaseStore()
      if (!baseStore.canvas) return

      // 更新所有蓝牙指示器的状态
      this.elements.forEach(element => {
        if (element.eleType === 'bluetooth') {
          element.set('fill', status ? '#ffffff' : '#666666')
          baseStore.canvas.renderAll()
        }
      })
    },

    encodeConfig(element) {
      return {
        type: 'bluetooth',
        x: element.left,
        y: element.top,
        size: element.fontSize,
        font: element.fontFamily,
        color: element.fill,
      }
    },

    decodeConfig(config) {
      return {
        eleType: 'bluetooth',
        left: config.x,
        top: config.y,
        fontSize: config.size,
        fontFamily: config.font,
        fill: config.color,
      }
    }
  }
})
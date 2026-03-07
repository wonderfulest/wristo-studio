import { defineStore } from 'pinia'
import { useBaseStore } from './baseStore'
import { useCircleStore, type CircleOptions } from './elements/shapes/circleElement'
import { useWindDirectionStore } from './elements/weather/windDirectionElement'
import { useTimeStore } from './elements/time/timeElement'
import { useIconStore } from './elements/data/iconElement'
import { useDataStore } from './elements/data/dataElement'
import { useLayerStore } from './layerStore'
import type { FabricElement } from '@/types/element'
import type { WindDirectionElementConfig } from '@/types/elements/data'
import type { TimeElementConfig } from '@/types/elements'
import type { IconElementConfig } from '@/types/elements'
import type { DataElementConfig } from '@/types/elements/data'

export const useElementStore = defineStore('element', {
  state: () => ({
    baseStore: useBaseStore(),
    layerStore: useLayerStore(),
    circleStore: useCircleStore(),
    windDirectionStore: useWindDirectionStore(),
    timeStore: useTimeStore(),
    iconStore: useIconStore(),
    dataStore: useDataStore(),
  }),

  actions: {
    // 统一新增入口：按类型分发到具体元素 Store
    async addElement(type: string, config: Record<string, any>) {
      switch (type) {
        case 'circle':
          return await this.circleStore.addElement(config as CircleOptions)
        case 'windDirection':
          return await this.windDirectionStore.addElement(config as WindDirectionElementConfig)
        case 'time':
          return await this.timeStore.addElement(config as TimeElementConfig)
        case 'icon':
          return await this.iconStore.addElement(config as IconElementConfig)
        case 'data':
          return await this.dataStore.addElement(config as DataElementConfig)
        default:
          console.warn('[ElementStore] addElement: unknown type', type, config)
          return null
      }
    },

    // 通用：根据 id 在当前画布上查找对象
    findObjectById(id: string): FabricElement | null {
      const objects = this.baseStore.getObjects()
      const target = objects.find((o) => o.id && String(o.id) === id)
      return (target as FabricElement) || null
    },

    // 统一更新入口：根据元素 eleType 分发到对应的 updateXxxById
    updateElementById(id: string, patch: Record<string, any>) {
      const element = this.findObjectById(id) as any
      if (!element) return

      const type = element.eleType as string | undefined
      switch (type) {
        case 'circle':
          this.updateCircleById(id, patch as CircleOptions)
          break
        case 'windDirection':
          this.updateWindDirectionById(id, patch as Partial<WindDirectionElementConfig>)
          break
        case 'time':
          this.updateTimeById(id, patch as Partial<TimeElementConfig>)
          break
        case 'icon':
          this.updateIconById(id, patch as Partial<IconElementConfig>)
          break
        case 'data':
          this.updateDataById(id, patch as Partial<DataElementConfig>)
          break
        default:
          console.warn('[ElementStore] updateElementById: unsupported eleType', { id, type, patch })
      }
    },

    // 统一删除入口：移除画布对象并同步 layerStore
    removeElementById(id: string) {
      const canvas = this.baseStore.canvas
      if (!canvas) return
      const objects = canvas.getObjects() as FabricElement[]
      const target = objects.find((o) => o.id && String(o.id) === id)
      if (!target) return

      try {
        canvas.remove(target as any)
      } catch (e) {
        console.warn('[ElementStore] removeElementById: remove from canvas failed', { id, e })
      }

      try {
        this.layerStore.removeLayer(String(id))
      } catch (e) {
        console.warn('[ElementStore] removeElementById: remove layer failed', { id, e })
      }

      canvas.renderAll?.()
    },

    // Circle：通过 id 更新圆形
    updateCircleById(id: string, options: CircleOptions = {}) {
      const target = this.findObjectById(id)
      if (!target) return
      this.circleStore.updateElement(target as any, options)
    },

    // WindDirection：通过 id 更新风向元素
    updateWindDirectionById(id: string, config: Partial<WindDirectionElementConfig> = {}) {
      const target = this.findObjectById(id)
      if (!target) return
      this.windDirectionStore.updateElement(target as any, config)
    },

    // Time：通过 id 更新时间元素（支持 truetype / bitmap 切换）
    updateTimeById(id: string, config: Partial<TimeElementConfig> = {}) {
      const target = this.findObjectById(id)
      if (!target) return
      // timeStore.updateElement 当前签名使用 TimeElementConfig，这里使用 Partial 并在内部补全
      this.timeStore.updateElement(target as any, config as TimeElementConfig)
    },

    // Icon：通过 id 更新图标元素
    updateIconById(id: string, config: Partial<IconElementConfig> = {}) {
      const target = this.findObjectById(id)
      if (!target) return
      this.iconStore.updateElement(target as any, config)
    },

    // Data：通过 id 更新数据元素
    updateDataById(id: string, config: Partial<DataElementConfig> = {}) {
      const target = this.findObjectById(id)
      if (!target) return
      this.dataStore.updateElement(target as any, config)
    },
  },
})

import { defineStore } from 'pinia'
import type { ElementType, FabricElement } from '@/types/element'
import type { AnyElementConfig } from '@/types/elements'

export type ElementConfigSnapshot = {
  id: string
  eleType: ElementType
  config: AnyElementConfig
}

export const useElementDataStore = defineStore('elementData', {
  // Option Store 写法：集中定义 state / getters / actions
  state: () => ({
    // 使用 Map 存储，避免大数组扫描
    elementMap: new Map<string, ElementConfigSnapshot>(),
  }),

  getters: {
    // 所有元素的快照列表
    elements(state): ElementConfigSnapshot[] {
      return Array.from(state.elementMap.values())
    },

    // 按 id 获取配置，保持原有调用方式：store.getElementConfig(id)
    getElementConfig: (state) =>
      (id: string): AnyElementConfig | null => {
        const snap = state.elementMap.get(String(id))
        return (snap?.config as AnyElementConfig) ?? null
      },
  },

  actions: {
    upsertElement(config: AnyElementConfig) {
      if (!config || !config.id || !config.eleType) return
      const id = String(config.id)
      const eleType = config.eleType as ElementType
      const snapshot: ElementConfigSnapshot = {
        id,
        eleType,
        config: { ...config, id, eleType },
      }
      this.elementMap.set(id, snapshot)
    },

    patchElement(id: string, patch: Partial<AnyElementConfig>) {
      const key = String(id)
      const existing = this.elementMap.get(key)
      if (!existing) return
      const nextConfig: AnyElementConfig = {
        ...(existing.config as AnyElementConfig),
        ...(patch as AnyElementConfig),
        id: key,
        eleType: existing.eleType,
      }
      this.elementMap.set(key, {
        id: key,
        eleType: existing.eleType,
        config: nextConfig,
      })
    },

    removeElement(id: string) {
      this.elementMap.delete(String(id))
    },

    loadFromFabricElements(elements: FabricElement[]) {
      // 辅助方法：从一批 FabricElement 快速初始化数据模型
      elements.forEach((el) => {
        const id = (el as any).id
        const eleType = (el as any).eleType as ElementType | undefined
        if (!id || !eleType) return
        const base: AnyElementConfig = {
          id: String(id),
          eleType,
          left: (el as any).left,
          top: (el as any).top,
        } as AnyElementConfig
        this.upsertElement(base)
      })
    },
  },
})


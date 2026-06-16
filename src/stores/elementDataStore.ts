import { defineStore } from 'pinia'
import type { ElementType, FabricElement } from '@/types/element'
import type { AnyElementConfig } from '@/types/elements'
import { normalizeFontSizePatch } from '@/utils/fontSize'

export type ElementConfigSnapshot = {
  id: string
  eleType: ElementType
  config: AnyElementConfig
}

/**
 * 每个元素 id 对应的**业务配置**（JSON），用于保存、回放、撤销。
 */
export const useElementDataStore = defineStore('elementData', {
  // Option Store 写法：集中定义 state / getters / actions
  state: () => ({
    // 使用普通对象按 id 存储配置，便于持久化
    elementMap: {} as Record<string, ElementConfigSnapshot>,
  }),

  getters: {
    // 所有元素的快照列表
    elements(state): ElementConfigSnapshot[] {
      return Object.values(state.elementMap)
    },

    // 按 id 获取配置，保持原有调用方式：store.getElementConfig(id)
    getElementConfig: (state) =>
      (id: string): AnyElementConfig | null => {
        const snap = state.elementMap[String(id)]
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
        config: normalizeFontSizePatch({ ...config, id, eleType } as AnyElementConfig),
      }
      this.elementMap[id] = snapshot
    },

    patchElement(id: string, patch: Partial<AnyElementConfig>) {
      const key = String(id)
      const existing = this.elementMap[key]
      if (!existing) return
      const nextConfig: AnyElementConfig = {
        ...(existing.config as AnyElementConfig),
        ...(normalizeFontSizePatch(patch) as AnyElementConfig),
        id: key,
        eleType: existing.eleType,
      }
      this.elementMap[key] = {
        id: key,
        eleType: existing.eleType,
        config: nextConfig,
      }
    },

    clearAll() {
      this.elementMap = {}
    },

    removeElement(id: string) {
      delete this.elementMap[String(id)]
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

  persist: {
    storage: sessionStorage,
    key: 'elementData',
  },
})

import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { GoalArcElementConfig } from '@/types/elements/goal'
import { useElementDataStore } from '@/stores/elementDataStore'
import { createGoalArc, updateGoalArc } from '@/elements/goal/goalArc/goalArc.renderer'
import { encodeGoalArc, decodeGoalArc } from '@/elements/goal/goalArc/goalArc.encoder'
import GoalArcSettings from '@/elements/goal/goalArc/goalArc.panel.vue'

export default function registerGoalArcPlugin() {
  registerElement('goalArc' as ElementType, {
    add: (config) => {
      const element = createGoalArc(config as GoalArcElementConfig)

      // 使用 renderer/encoder 生成规范化配置并写入 ElementDataStore
      try {
        const fullConfig = encodeGoalArc(element as any)
        const elementDataStore = useElementDataStore()
        elementDataStore.upsertElement(fullConfig as any)
      } catch (e) {
        console.warn('[goalArc.plugin] failed to encode & upsert element config after add', e)
      }

      return element
    },
    update: (element, patch) => {
      return updateGoalArc(element as any, patch as Partial<GoalArcElementConfig>)
    },
    encode: (element) => {
      return encodeGoalArc(element as any)
    },
    decode: (config) => {
      return decodeGoalArc(config as GoalArcElementConfig)
    },
  })

  registerSettings('goalArc' as ElementType, GoalArcSettings)
}

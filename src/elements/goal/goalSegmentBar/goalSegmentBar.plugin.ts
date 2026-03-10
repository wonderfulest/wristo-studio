import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { GoalSegmentBarElementConfig } from '@/types/elements/goal'
import { useElementDataStore } from '@/stores/elementDataStore'
import { createGoalSegmentBar, updateGoalSegmentBar } from '@/elements/goal/goalSegmentBar/goalSegmentBar.renderer'
import { encodeGoalSegmentBar, decodeGoalSegmentBar } from '@/elements/goal/goalSegmentBar/goalSegmentBar.encoder'
import GoalSegmentBarSettings from '@/elements/goal/goalSegmentBar/goalSegmentBar.panel.vue'

export default function registerGoalSegmentBarPlugin() {
  registerElement('goalSegmentBar' as ElementType, {
    add: (config) => {
      const element = createGoalSegmentBar(config as GoalSegmentBarElementConfig)

      try {
        const fullConfig = encodeGoalSegmentBar(element as any)
        const elementDataStore = useElementDataStore()
        elementDataStore.upsertElement(fullConfig as any)
      } catch (e) {
        console.warn('[goalSegmentBar.plugin] failed to encode & upsert element config after add', e)
      }

      return element
    },
    update: (element, patch) => {
      return updateGoalSegmentBar(element as any, patch as Partial<GoalSegmentBarElementConfig>)
    },
    encode: (element) => {
      return encodeGoalSegmentBar(element as any)
    },
    decode: (config) => {
      return decodeGoalSegmentBar(config as GoalSegmentBarElementConfig)
    },
  })

  registerSettings('goalSegmentBar' as ElementType, GoalSegmentBarSettings)
}

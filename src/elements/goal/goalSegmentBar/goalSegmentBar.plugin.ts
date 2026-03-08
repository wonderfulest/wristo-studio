import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useGoalSegmentBarStore } from '@/elements/goal/goalSegmentBar/goalSegmentBarElement'
import type { GoalSegmentBarElementConfig } from '@/types/elements/goal'
import GoalSegmentBarSettings from '@/elements/goal/goalSegmentBar/goalSegmentBarSettings.vue'

export default function registerGoalSegmentBarPlugin() {
  registerElement('goalSegmentBar' as ElementType, {
    add: (_type, config) => {
      const store = useGoalSegmentBarStore()
      return store.addElement(config as GoalSegmentBarElementConfig)
    },
    update: (element, patch) => {
      const store = useGoalSegmentBarStore()
      store.updateElement(element as any, patch as Partial<GoalSegmentBarElementConfig>)
    },
    encode: (element) => {
      const store = useGoalSegmentBarStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useGoalSegmentBarStore()
      return store.decodeConfig(config as GoalSegmentBarElementConfig)
    },
  })

  registerSettings('goalSegmentBar' as ElementType, GoalSegmentBarSettings)
}

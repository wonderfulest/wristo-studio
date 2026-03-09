import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useGoalArcStore } from '@/elements/goal/goalArc/goalArcElement'
import type { GoalArcElementConfig } from '@/types/elements/goal'
import GoalArcSettings from '@/elements/goal/goalArc/goalArcSettings.vue'

export default function registerGoalArcPlugin() {
  registerElement('goalArc' as ElementType, {
    add: (config) => {
      const store = useGoalArcStore()
      return store.addElement(config as GoalArcElementConfig)
    },
    update: (element, patch) => {
      const store = useGoalArcStore()
      store.updateElement(element as any, patch as Partial<GoalArcElementConfig>)
    },
    encode: (element) => {
      const store = useGoalArcStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useGoalArcStore()
      return store.decodeConfig(config as GoalArcElementConfig)
    },
  })

  registerSettings('goalArc' as ElementType, GoalArcSettings)
}

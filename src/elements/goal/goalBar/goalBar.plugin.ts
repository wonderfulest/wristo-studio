import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useGoalBarStore } from '@/elements/goal/goalBar/goalBarElement'
import type { GoalBarElementConfig } from '@/types/elements/goal'
import GoalBarSettings from '@/elements/goal/goalBar/goalBarSettings.vue'

export default function registerGoalBarPlugin() {
  registerElement('goalBar' as ElementType, {
    add: (_type, config) => {
      const store = useGoalBarStore()
      return store.addElement(config as GoalBarElementConfig)
    },
    update: (element, patch) => {
      const store = useGoalBarStore()
      store.updateElement(element as any, patch as Partial<GoalBarElementConfig>)
    },
    encode: (element) => {
      const store = useGoalBarStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useGoalBarStore()
      return store.decodeConfig(config as GoalBarElementConfig)
    },
  })

  registerSettings('goalBar' as ElementType, GoalBarSettings)
}

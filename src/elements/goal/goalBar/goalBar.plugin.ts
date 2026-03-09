import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { GoalBarElementConfig } from '@/types/elements/goal'
import { createGoalBar, updateGoalBar } from '@/elements/goal/goalBar/goalBar.renderer'
import { encodeGoalBar, decodeGoalBar } from '@/elements/goal/goalBar/goalBar.encoder'
import GoalBarPanel from '@/elements/goal/goalBar/goalBar.panel.vue'

export default function registerGoalBarPlugin() {
  registerElement('goalBar' as ElementType, {
    add: (config) => {
      return createGoalBar(config as GoalBarElementConfig)
    },
    update: (element, patch) => {
      updateGoalBar(element as any, patch as Partial<GoalBarElementConfig>)
    },
    encode: (element) => {
      return encodeGoalBar(element as any)
    },
    decode: (config) => {
      return decodeGoalBar(config as GoalBarElementConfig)
    },
  })

  registerSettings('goalBar' as ElementType, GoalBarPanel)
}

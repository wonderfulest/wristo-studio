import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useSecondHandStore } from '@/elements/hands/secondHand/secondHandElement'
import SecondHandSettings from '@/elements/hands/secondHand/secondHandSettings.vue'
import type { HandElementConfig } from '@/types/elements'

export default function registerSecondHandPlugin() {
  registerElement('secondHand' as ElementType, {
    add: (config) => {
      const store = useSecondHandStore()
      return store.addElement(config as HandElementConfig)
    },
    update: (element, patch) => {
      const store = useSecondHandStore()
      store.updateHandSVG(element as any, patch as Partial<HandElementConfig> as HandElementConfig)
    },
    encode: (element) => {
      const store = useSecondHandStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useSecondHandStore()
      return store.decodeConfig(config as HandElementConfig)
    },
  })

  registerSettings('secondHand' as ElementType, SecondHandSettings)
}

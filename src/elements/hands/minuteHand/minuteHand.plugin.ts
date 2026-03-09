import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useMinuteHandStore } from '@/elements/hands/minuteHand/minuteHandElement'
import MinuteHandSettings from '@/elements/hands/minuteHand/minuteHandSettings.vue'
import type { HandElementConfig } from '@/types/elements'

export default function registerMinuteHandPlugin() {
  registerElement('minuteHand' as ElementType, {
    add: (config) => {
      const store = useMinuteHandStore()
      return store.addElement(config as HandElementConfig)
    },
    update: (element, patch) => {
      const store = useMinuteHandStore()
      store.updateHandSVG(element as any, patch as Partial<HandElementConfig> as HandElementConfig)
    },
    encode: (element) => {
      const store = useMinuteHandStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useMinuteHandStore()
      return store.decodeConfig(config as HandElementConfig)
    },
  })

  registerSettings('minuteHand' as ElementType, MinuteHandSettings)
}

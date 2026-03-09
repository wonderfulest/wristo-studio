import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useDisturbStore } from '@/elements/indicators/disturb/disturbElement'
import DisturbSettings from '@/elements/indicators/disturb/disturbSettings.vue'
import type { IndicatorElementConfig } from '@/types/elements'

export default function registerDisturbPlugin() {
  registerElement('disturb' as ElementType, {
    add: (config) => {
      const store = useDisturbStore()
      return store.addElement(config as IndicatorElementConfig)
    },
    update: (element, patch) => {
      const store = useDisturbStore()
      store.updateElement(element as any, patch as Partial<IndicatorElementConfig>)
    },
    encode: (element) => {
      const store = useDisturbStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useDisturbStore()
      return store.decodeConfig(config as IndicatorElementConfig)
    },
  })

  registerSettings('disturb' as ElementType, DisturbSettings)
}

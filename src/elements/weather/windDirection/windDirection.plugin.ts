import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useWindDirectionStore } from '@/elements/weather/windDirection/windDirectionElement'
import WindDirectionSettings from '@/elements/weather/windDirection/windDirectionSettings.vue'
import type { WindDirectionElementConfig } from '@/types/elements/data'

export default function registerWindDirectionPlugin() {
  registerElement('windDirection' as ElementType, {
    add: (config) => {
      const store = useWindDirectionStore()
      return store.addElement(config as any)
    },
    update: (element, patch) => {
      const store = useWindDirectionStore()
      store.updateElement(element as any, patch as Partial<WindDirectionElementConfig>)
    },
    encode: (element) => {
      const store = useWindDirectionStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useWindDirectionStore()
      return store.decodeConfig(config as WindDirectionElementConfig)
    },
  })

  registerSettings('windDirection' as ElementType, WindDirectionSettings)
}

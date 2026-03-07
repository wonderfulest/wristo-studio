import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useTimeStore } from '@/elements/time/time/timeElement'
import type { TimeElementConfig } from '@/types/elements'
import TimeSettings from '@/elements/time/time/timeSettings.vue'

export default function registerTimePlugin() {
  registerElement('time' as ElementType, {
    add: (_type, config) => {
      const store = useTimeStore()
      return store.addElement(config as TimeElementConfig)
    },
    update: (element, patch) => {
      const store = useTimeStore()
      store.updateElement(element as any, patch as TimeElementConfig)
    },
    encode: (element) => {
      const store = useTimeStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useTimeStore()
      return store.decodeConfig(config as TimeElementConfig)
    },
  })

  registerSettings('time' as ElementType, TimeSettings)
}

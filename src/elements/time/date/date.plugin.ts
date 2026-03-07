import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useDateStore } from '@/elements/time/date/dateElement'
import type { DateElementConfig } from '@/types/elements'
import DateSettings from '@/elements/time/date/DateSettings.vue'

export default function registerDatePlugin() {
  registerElement('date' as ElementType, {
    add: (_type, config) => {
      const store = useDateStore()
      return store.addElement(config as DateElementConfig)
    },
    update: (element, patch) => {
      const store = useDateStore()
      store.updateElement(element as any, patch as DateElementConfig)
    },
    encode: (element) => {
      const store = useDateStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useDateStore()
      return store.decodeConfig(config as DateElementConfig)
    },
  })

  registerSettings('date' as ElementType, DateSettings)
}

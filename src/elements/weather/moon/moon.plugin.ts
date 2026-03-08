import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useMoonStore } from '@/elements/weather/moon/moonElement'
import MoonSettings from '@/elements/weather/moon/moonSettings.vue'
import type { MoonElementConfig } from '@/types/elements/data'

export default function registerMoonPlugin() {
  registerElement('moon' as ElementType, {
    add: (_type, config) => {
      const store = useMoonStore()
      return store.addElement(config as MoonElementConfig)
    },
    update: (element, patch) => {
      const store = useMoonStore()
      store.updateElement(element as any, patch as Partial<MoonElementConfig>)
    },
    encode: (element) => {
      const store = useMoonStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useMoonStore()
      return store.decodeConfig(config as MoonElementConfig)
    },
  })

  registerSettings('moon' as ElementType, MoonSettings)
}

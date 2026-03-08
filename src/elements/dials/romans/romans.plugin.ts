import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useRomansStore } from '@/elements/dials/romans/romansElement'
import RomansSettings from '@/elements/dials/romans/romansSettings.vue'
import type { DialElementConfig } from '@/elements/dials/romans/romansElement'

export default function registerRomansPlugin() {
  registerElement('romans' as ElementType, {
    add: (_type, config) => {
      const store = useRomansStore()
      return store.addElement(config as unknown as DialElementConfig)
    },
    update: (element, patch) => {
      const store = useRomansStore()
      store.updateElement(element as any, patch as any)
    },
    encode: (element) => {
      const store = useRomansStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useRomansStore()
      return store.decodeConfig(config as any)
    },
  })

  registerSettings('romans' as ElementType, RomansSettings)
}

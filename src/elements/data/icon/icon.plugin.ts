import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useIconStore } from '@/elements/data/icon/iconElement'
import type { IconElementConfig } from '@/types/elements/data'
import iconSettings from '@/elements/data/icon/IconSettings.vue'

export default function registerIconPlugin() {
  registerElement('icon' as ElementType, {
    add: (config) => {
      const store = useIconStore()
      return store.addElement(config as IconElementConfig)
    },
    update: (element, patch) => {
      const store = useIconStore()
      store.updateElement(element as any, patch as Partial<IconElementConfig>)
    },
    encode: (element) => {
      const store = useIconStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useIconStore()
      return store.decodeConfig(config as IconElementConfig)
    },
  })

  registerSettings('icon' as ElementType, iconSettings)
}

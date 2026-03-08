import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useCenterCapStore } from '@/elements/dials/centerCap/centerCapElement'
import CenterCapSettings from '@/elements/dials/centerCap/centerCapSettings.vue'
import type { DialElementConfig } from '@/elements/dials/romans/romansElement'

export default function registerCenterCapPlugin() {
  registerElement('centerCap' as ElementType, {
    add: (_type, config) => {
      const store = useCenterCapStore()
      return store.addElement(config as unknown as DialElementConfig)
    },
    update: (element, patch) => {
      const store = useCenterCapStore()
      store.updateElement(element as any, patch as any)
    },
    encode: (element) => {
      const store = useCenterCapStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useCenterCapStore()
      return store.decodeConfig(config as any)
    },
  })

  registerSettings('centerCap' as ElementType, CenterCapSettings)
}

import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useTick60Store } from '@/elements/dials/tick60/tick60Element'
import Tick60Settings from '@/elements/dials/tick60/tick60Settings.vue'
import type { DialElementConfig } from '@/elements/dials/romans/romans.encoder'

export default function registerTick60Plugin() {
  registerElement('tick60' as ElementType, {
    add: (config) => {
      const store = useTick60Store()
      return store.addElement(config as unknown as DialElementConfig)
    },
    update: (element, patch) => {
      const store = useTick60Store()
      store.updateElement(element as any, patch as any)
    },
    encode: (element) => {
      const store = useTick60Store()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useTick60Store()
      return store.decodeConfig(config as any)
    },
  })

  registerSettings('tick60' as ElementType, Tick60Settings)
}

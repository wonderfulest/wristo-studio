import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useTick12Store } from '@/elements/dials/tick12/tick12Element'
import Tick12Settings from '@/elements/dials/tick12/tick12Settings.vue'
import type { DialElementConfig } from '@/elements/dials/romans/romansElement'

export default function registerTick12Plugin() {
  registerElement('tick12' as ElementType, {
    add: (_type, config) => {
      const store = useTick12Store()
      return store.addElement(config as unknown as DialElementConfig)
    },
    update: (element, patch) => {
      const store = useTick12Store()
      store.updateElement(element as any, patch as any)
    },
    encode: (element) => {
      const store = useTick12Store()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useTick12Store()
      return store.decodeConfig(config as any)
    },
  })

  registerSettings('tick12' as ElementType, Tick12Settings)
}

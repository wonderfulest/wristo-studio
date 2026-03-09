import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useMoveBarStore } from '@/elements/status/movebar/movebarElement'
import MoveBarSettings from '@/elements/status/movebar/movebarSettings.vue'
import type { MoveBarElementConfig } from '@/types/elements/status'

export default function registerMoveBarPlugin() {
  registerElement('moveBar' as ElementType, {
    add: (config) => {
      const store = useMoveBarStore()
      return store.addElement(config as MoveBarElementConfig)
    },
    update: (element, patch) => {
      const store = useMoveBarStore()
      store.updateElement(element as any, patch as Partial<MoveBarElementConfig>)
    },
    encode: (element) => {
      const store = useMoveBarStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useMoveBarStore()
      return store.decodeConfig(config as MoveBarElementConfig)
    },
  })

  registerSettings('moveBar' as ElementType, MoveBarSettings)
}

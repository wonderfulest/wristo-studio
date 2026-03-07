import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useCircleStore, type CircleOptions } from '@/elements/shapes/circle/circleElement'
import CircleSettings from '@/elements/shapes/circle/circleSettings.vue'

export default function registerCirclePlugin() {
  registerElement('circle' as ElementType, {
    add: (_type, config) => {
      const store = useCircleStore()
      return store.addElement(config as CircleOptions)
    },
    update: (element, patch) => {
      const store = useCircleStore()
      store.updateElement(element as any, patch as CircleOptions)
    },
    encode: (element) => {
      const store = useCircleStore()
      return store.encodeConfig(element as any) as any
    },
    decode: (config) => {
      const store = useCircleStore()
      return store.decodeConfig(config as any)
    },
  })

  registerSettings('circle' as ElementType, CircleSettings)
}

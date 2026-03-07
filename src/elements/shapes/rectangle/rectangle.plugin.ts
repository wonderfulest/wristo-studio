import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useRectangleStore } from '@/elements/shapes/rectangle/rectangleElement'
import RectangleSettings from '@/elements/shapes/rectangle/rectangleSettings.vue'
import type { RectangleElementConfig } from '@/types/elements'

export default function registerRectanglePlugin() {
  registerElement('rectangle' as ElementType, {
    add: (_type, config) => {
      const store = useRectangleStore()
      return store.addElement(config as RectangleElementConfig)
    },
    update: (element, patch) => {
      const store = useRectangleStore()
      store.updateElement(element as any, patch as Partial<RectangleElementConfig> as any)
    },
    encode: (element) => {
      const store = useRectangleStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useRectangleStore()
      return store.decodeConfig(config as RectangleElementConfig)
    },
  })

  registerSettings('rectangle' as ElementType, RectangleSettings)
}

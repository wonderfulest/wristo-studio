import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { LineElementConfig } from '@/types/elements'
import { useLineStore, type LineOptions } from '@/elements/shapes/line/lineElement'
import LineSettings from '@/elements/shapes/line/lineSettings.vue'

export default function registerLinePlugin() {
  registerElement('line' as ElementType, {
    add: (config) => {
      const store = useLineStore()
      return store.addElement(config as LineElementConfig as unknown as LineOptions)
    },
    update: (element, patch) => {
      const store = useLineStore()
      store.updateElement(element as any, patch as Partial<LineOptions>)
    },
    encode: (element) => {
      const store = useLineStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useLineStore()
      return store.decodeConfig(config as LineElementConfig)
    },
  })

  registerSettings('line' as ElementType, LineSettings)
}

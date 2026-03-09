import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useLabelStore } from '@/elements/data/label/labelElement'
import type { LabelElementConfig } from '@/types/elements/data'
import LabelSettings from '@/elements/data/label/LabelSettings.vue'

export default function registerLabelPlugin() {
  registerElement('label' as ElementType, {
    add: (config) => {
      const store = useLabelStore()
      return store.addElement(config as LabelElementConfig)
    },
    update: (element, patch) => {
      const store = useLabelStore()
      store.updateElement(element as any, patch as Partial<LabelElementConfig>)
    },
    encode: (element) => {
      const store = useLabelStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useLabelStore()
      return store.decodeConfig(config as LabelElementConfig)
    },
  })

  registerSettings('label' as ElementType, LabelSettings)
}

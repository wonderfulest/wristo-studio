import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { LabelElementConfig } from '@/types/elements/data'
import { createLabel, updateLabel } from '@/elements/data/label/label.renderer'
import { encodeLabel, decodeLabel } from '@/elements/data/label/label.encoder'
import LabelPanel from '@/elements/data/label/label.panel.vue'

export default function registerLabelPlugin() {
  registerElement('label' as ElementType, {
    add: (config) => {
      return createLabel(config as LabelElementConfig)
    },
    update: (element, patch) => {
      updateLabel(element as any, patch as Partial<LabelElementConfig>)
    },
    encode: (element) => {
      return encodeLabel(element as any) as any
    },
    decode: (config) => {
      return decodeLabel(config as LabelElementConfig) as any
    },
  })

  registerSettings('label' as ElementType, LabelPanel)
}

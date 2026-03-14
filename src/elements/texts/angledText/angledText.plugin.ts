import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementConfig, ElementType } from '@/types/element'
import type { TextElementConfig } from '@/types/elements'
import { createAngledText, updateAngledText } from '@/elements/texts/angledText/angledText.renderer'
import { encodeAngledText, decodeAngledText } from '@/elements/texts/angledText/angledText.encoder'
import AngledTextPanel from '@/elements/texts/angledText/angledText.panel.vue'

export default function registerAngledTextPlugin() {
  registerElement('angledText' as ElementType, {
    add: (config) => {
      return createAngledText(config as TextElementConfig) as any
    },
    update: (element, patch) => {
      return updateAngledText(element as any, patch as Partial<TextElementConfig>)
    },
    encode: (element) => {
      return encodeAngledText(element as any) as unknown as ElementConfig
    },
    decode: (config) => {
      return decodeAngledText(config as TextElementConfig)
    },
  })

  registerSettings('angledText' as ElementType, AngledTextPanel)
}

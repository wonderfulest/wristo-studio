import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementConfig, ElementType } from '@/types/element'
import type { TextElementConfig } from '@/types/elements'
import { createText, updateText } from '@/elements/texts/text/text.renderer'
import { encodeText, decodeText } from '@/elements/texts/text/text.encoder'
import TextPanel from '@/elements/texts/text/text.panel.vue'

export default function registerTextPlugin() {
  registerElement('text' as ElementType, {
    add: (config) => {
      return createText(config as TextElementConfig)
    },
    update: (element, patch) => {
      return updateText(element as any, patch as Partial<TextElementConfig>)
    },
    encode: (element) => {
      return encodeText(element as any) as unknown as ElementConfig
    },
    decode: (config) => {
      return decodeText(config as TextElementConfig) as any
    },
  })

  registerSettings('text' as ElementType, TextPanel)
}

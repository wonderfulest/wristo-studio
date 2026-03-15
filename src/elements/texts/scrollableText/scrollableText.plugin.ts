import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementConfig, ElementType } from '@/types/element'
import type { TextElementConfig } from '@/types/elements'
import {
  createScrollableText,
  updateScrollableText,
} from '@/elements/texts/scrollableText/scrollableText.renderer'
import {
  encodeScrollableText,
  decodeScrollableText,
} from '@/elements/texts/scrollableText/scrollableText.encoder'
import ScrollableTextPanel from '@/elements/texts/scrollableText/scrollableText.panel.vue'

export default function registerScrollableTextPlugin() {
  registerElement('scrollableText' as ElementType, {
    add: (config) => {
      return createScrollableText(config as TextElementConfig) as any
    },
    update: (element, patch) => {
      return updateScrollableText(element as any, patch as Partial<TextElementConfig>)
    },
    encode: (element) => {
      return encodeScrollableText(element as any) as unknown as ElementConfig
    },
    decode: (config) => {
      return decodeScrollableText(config as TextElementConfig)
    },
  })

  registerSettings('scrollableText' as ElementType, ScrollableTextPanel)
}

import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementConfig, ElementType } from '@/types/element'
import type { TextElementConfig } from '@/types/elements'
import { createRadialText, updateRadialText } from '@/elements/texts/radialText/radialText.renderer'
import { encodeRadialText, decodeRadialText } from '@/elements/texts/radialText/radialText.encoder'
import RadialTextPanel from '@/elements/texts/radialText/radialText.panel.vue'

export default function registerRadialTextPlugin() {
  registerElement('radialText' as ElementType, {
    add: (config) => {
      return createRadialText(config as TextElementConfig) as any
    },
    update: (element, patch) => {
      return updateRadialText(element as any, patch as any)
    },
    encode: (element) => {
      return encodeRadialText(element as any) as unknown as ElementConfig
    },
    decode: (config) => {
      return decodeRadialText(config as TextElementConfig)
    },
  })

  registerSettings('radialText' as ElementType, RadialTextPanel)
}

import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { CircleElementConfig } from '@/types/elements'
import { createCircle, updateCircle } from '@/elements/shapes/circle/circle.renderer'
import { encodeCircle, decodeCircle } from '@/elements/shapes/circle/circle.encoder'
import CirclePanel from '@/elements/shapes/circle/circle.panel.vue'

export default function registerCirclePlugin() {
  registerElement('circle' as ElementType, {
    add: (config) => {
      return createCircle(config as CircleElementConfig)
    },
    update: (element, patch) => {
      updateCircle(element as any, patch as Partial<CircleElementConfig>)
    },
    encode: (element) => {
      return encodeCircle(element as any) as any
    },
    decode: (config) => {
      return decodeCircle(config as CircleElementConfig) as any
    },
  })

  registerSettings('circle' as ElementType, CirclePanel)
}

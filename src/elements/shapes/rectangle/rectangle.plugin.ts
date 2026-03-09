import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { RectangleElementConfig } from '@/types/elements'
import { createRectangle, updateRectangle } from '@/elements/shapes/rectangle/rectangle.renderer'
import { encodeRectangle, decodeRectangle } from '@/elements/shapes/rectangle/rectangle.encoder'
import RectanglePanel from '@/elements/shapes/rectangle/rectangle.panel.vue'

export default function registerRectanglePlugin() {
  registerElement('rectangle' as ElementType, {
    add: (config) => {
      return createRectangle(config as RectangleElementConfig)
    },
    update: (element, patch) => {
      updateRectangle(element as any, patch as Partial<RectangleElementConfig>)
    },
    encode: (element) => {
      return encodeRectangle(element as any) as any
    },
    decode: (config) => {
      return decodeRectangle(config as RectangleElementConfig) as any
    },
  })

  registerSettings('rectangle' as ElementType, RectanglePanel)
}

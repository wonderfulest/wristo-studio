import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { LineElementConfig } from '@/types/elements'
import { createLine, updateLine } from '@/elements/shapes/line/line.renderer'
import { encodeLine, decodeLine } from '@/elements/shapes/line/line.encoder'
import LinePanel from '@/elements/shapes/line/line.panel.vue'

export default function registerLinePlugin() {
  registerElement('line' as ElementType, {
    add: (config) => {
      return createLine(config as LineElementConfig)
    },
    update: (element, patch) => {
      updateLine(element as any, patch as Partial<LineElementConfig>)
    },
    encode: (element) => {
      return encodeLine(element as any) as any
    },
    decode: (config) => {
      return decodeLine(config as LineElementConfig) as any
    },
  })

  registerSettings('line' as ElementType, LinePanel)
}

import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { WindDirectionElementConfig } from '@/types/elements/data'
import { createWindDirection, updateWindDirection } from '@/elements/weather/windDirection/windDirection.renderer'
import { encodeWindDirection, decodeWindDirection } from '@/elements/weather/windDirection/windDirection.encoder'
import WindDirectionSettings from '@/elements/weather/windDirection/windDirection.panel.vue'

export default function registerWindDirectionPlugin() {
  registerElement('windDirection' as ElementType, {
    add: (config, renderContext) => {
      return createWindDirection(config as WindDirectionElementConfig, renderContext)
    },
    update: (element, patch) => {
      updateWindDirection(element as any, patch as Partial<WindDirectionElementConfig>)
    },
    encode: (element) => {
      return encodeWindDirection(element as any) as any
    },
    decode: (config) => {
      return decodeWindDirection(config as WindDirectionElementConfig) as any
    },
  })

  registerSettings('windDirection' as ElementType, WindDirectionSettings)
}

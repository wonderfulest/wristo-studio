import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { MoonElementConfig } from '@/types/elements/data'
import { createMoon, updateMoon } from '@/elements/weather/moon/moon.renderer'
import { encodeMoon, decodeMoon } from '@/elements/weather/moon/moon.encoder'
import MoonSettings from '@/elements/weather/moon/moon.panel.vue'

export default function registerMoonPlugin() {
  registerElement('moon' as ElementType, {
    add: (config) => {
      return createMoon(config as MoonElementConfig)
    },
    update: (element, patch) => {
      updateMoon(element as any, patch as Partial<MoonElementConfig>)
    },
    encode: (element) => {
      return encodeMoon(element as any) as any
    },
    decode: (config) => {
      return decodeMoon(config as MoonElementConfig) as any
    },
  })

  registerSettings('moon' as ElementType, MoonSettings)
}

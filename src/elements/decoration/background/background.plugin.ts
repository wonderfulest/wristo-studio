import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementConfig, ElementType } from '@/types/element'
import type { BackgroundElementConfig } from '@/types/elements/background'
import BackgroundPanel from './background.panel.vue'
import { createBackground, updateBackground } from './background.renderer'
import { encodeBackground, decodeBackground } from './background.encoder'

export default function registerBackgroundPlugin() {
  registerElement('background' as ElementType, {
    add: (config) => {
      return createBackground(config as unknown as BackgroundElementConfig) as Promise<any>
    },
    update: (element, patch) => {
      return updateBackground(element as any, patch as Partial<BackgroundElementConfig>)
    },
    encode: (element) => {
      return encodeBackground(element as any) as unknown as ElementConfig
    },
    decode: (config) => {
      return decodeBackground(config as any)
    },
  })

  registerSettings('background' as ElementType, BackgroundPanel)
}

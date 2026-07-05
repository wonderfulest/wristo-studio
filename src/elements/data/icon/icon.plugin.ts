import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { IconElementConfig } from '@/types/elements/data'
import { createIcon, updateIcon } from '@/elements/data/icon/icon.renderer'
import { encodeIcon, decodeIcon } from '@/elements/data/icon/icon.encoder'
import IconPanel from '@/elements/data/icon/icon.panel.vue'

export default function registerIconPlugin() {
  registerElement('icon' as ElementType, {
    add: (config) => {
      return createIcon(config as IconElementConfig)
    },
    update: (element, patch) => {
      return updateIcon(element as any, patch as Partial<IconElementConfig>)
    },
    encode: (element) => {
      return encodeIcon(element as any) as any
    },
    decode: (config) => {
      return decodeIcon(config as IconElementConfig) as any
    },
  })

  registerSettings('icon' as ElementType, IconPanel)
}

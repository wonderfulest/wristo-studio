import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementConfig, ElementType } from '@/types/element'
import CenterCapPanel from '@/elements/dials/centerCap/centerCap.panel.vue'
import type { CenterCapElementConfig } from '@/elements/dials/centerCap/centerCap.encoder'
import { createCenterCap, updateCenterCap } from '@/elements/dials/centerCap/centerCap.renderer'
import { encodeCenterCap, decodeCenterCap } from '@/elements/dials/centerCap/centerCap.encoder'

export default function registerCenterCapPlugin() {
  registerElement('centerCap' as ElementType, {
    add: (config, renderContext) => {
      return createCenterCap(
        config as unknown as CenterCapElementConfig,
        renderContext,
      ) as Promise<any>
    },
    update: (element, patch) => {
      return updateCenterCap(element as any, patch as Partial<CenterCapElementConfig>)
    },
    encode: (element) => {
      return encodeCenterCap(element as any) as unknown as ElementConfig
    },
    decode: (config) => {
      return decodeCenterCap(config as any)
    },
  })

  registerSettings('centerCap' as ElementType, CenterCapPanel)
}

import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementConfig, ElementType } from '@/types/element'
import type { DialElementConfig } from '@/elements/dials/tick60/tick60.encoder'
import { createTick60, updateTick60 } from '@/elements/dials/tick60/tick60.renderer'
import { encodeTick60, decodeTick60 } from '@/elements/dials/tick60/tick60.encoder'
import Tick60Panel from '@/elements/dials/tick60/tick60.panel.vue'

export default function registerTick60Plugin() {
  registerElement('tick60' as ElementType, {
    add: (config) => {
      return createTick60(config as DialElementConfig) as Promise<any>
    },
    update: (element, patch) => {
      return updateTick60(element as any, patch as Partial<DialElementConfig>)
    },
    encode: (element) => {
      return encodeTick60(element as any) as unknown as ElementConfig
    },
    decode: (config) => {
      return decodeTick60(config as DialElementConfig)
    },
  })

  registerSettings('tick60' as ElementType, Tick60Panel)
}

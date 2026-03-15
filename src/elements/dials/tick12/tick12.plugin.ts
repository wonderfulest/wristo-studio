import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementConfig, ElementType } from '@/types/element'
import type { DialElementConfig } from '@/elements/dials/tick12/tick12.encoder'
import { createTick12, updateTick12 } from '@/elements/dials/tick12/tick12.renderer'
import { encodeTick12, decodeTick12 } from '@/elements/dials/tick12/tick12.encoder'
import Tick12Panel from '@/elements/dials/tick12/tick12.panel.vue'

export default function registerTick12Plugin() {
  registerElement('tick12' as ElementType, {
    add: (config) => {
      // registry 要求返回 FabricElement | Promise<FabricElement>，这里通过断言收窄泛型
      return createTick12(config as DialElementConfig) as Promise<any>
    },
    update: (element, patch) => {
      return updateTick12(element as any, patch as Partial<DialElementConfig>)
    },
    encode: (element) => {
      // encode 需要返回 ElementConfig | null，这里用 ElementConfig 做类型适配
      return encodeTick12(element as any) as unknown as ElementConfig
    },
    decode: (config) => {
      return decodeTick12(config as DialElementConfig)
    },
  })

  registerSettings('tick12' as ElementType, Tick12Panel)
}

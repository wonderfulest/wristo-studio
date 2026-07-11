import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import SecondHandPanel from '@/elements/hands/secondHand/secondHand.panel.vue'
import type { HandElementConfig } from '@/types/elements'
import { createHand, updateHand } from '@/elements/hands/common/hand.renderer'
import { encodeHand, decodeHand } from '@/elements/hands/common/hand.encoder'

export default function registerSecondHandPlugin() {
  registerElement('secondHand' as ElementType, {
    add: (config, renderContext) => {
      return createHand({ ...(config as HandElementConfig), eleType: 'secondHand' }, renderContext)
    },
    update: (element, patch) => {
      // 目前只关心素材和 assetId，其他字段仍由时间驱动逻辑控制
      return updateHand(element as any, patch as Partial<HandElementConfig>)
    },
    encode: (element) => {
      return encodeHand(element as any)
    },
    decode: (config) => {
      return decodeHand({ ...(config as HandElementConfig), eleType: 'secondHand' } as HandElementConfig)
    },
  })

  registerSettings('secondHand' as ElementType, SecondHandPanel)
}

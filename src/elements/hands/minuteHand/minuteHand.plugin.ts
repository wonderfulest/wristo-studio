import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import MinuteHandPanel from '@/elements/hands/minuteHand/minuteHand.panel.vue'
import type { HandElementConfig } from '@/types/elements'
import { createHand, updateHand } from '@/elements/hands/common/hand.renderer'
import { encodeHand, decodeHand } from '@/elements/hands/common/hand.encoder'

export default function registerMinuteHandPlugin() {
  registerElement('minuteHand' as ElementType, {
    add: (config) => {
      return createHand({ ...(config as HandElementConfig), eleType: 'minuteHand' })
    },
    update: (element, patch) => {
      // 目前只关心素材和 assetId，其他字段仍由时间驱动逻辑控制
      return updateHand(element as any, patch as Partial<HandElementConfig>)
    },
    encode: (element) => {
      return encodeHand(element as any)
    },
    decode: (config) => {
      return decodeHand({ ...(config as HandElementConfig), eleType: 'minuteHand' } as HandElementConfig)
    },
  })

  registerSettings('minuteHand' as ElementType, MinuteHandPanel)
}

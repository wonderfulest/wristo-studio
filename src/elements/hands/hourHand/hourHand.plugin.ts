import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useHourHandStore } from '@/elements/hands/hourHand/hourHandElement'
import HourHandSettings from '@/elements/hands/hourHand/hourHandSettings.vue'
import type { HandElementConfig } from '@/types/elements'

export default function registerHourHandPlugin() {
  registerElement('hourHand' as ElementType, {
    add: (config) => {
      const store = useHourHandStore()
      return store.addElement(config as HandElementConfig)
    },
    update: (element, patch) => {
      const store = useHourHandStore()
      // 目前只关心素材和 assetId，其他字段仍由时间驱动逻辑控制
      store.updateHandSVG(element as any, patch as Partial<HandElementConfig> as HandElementConfig)
    },
    encode: (element) => {
      const store = useHourHandStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useHourHandStore()
      return store.decodeConfig(config as HandElementConfig)
    },
  })

  registerSettings('hourHand' as ElementType, HourHandSettings)
}

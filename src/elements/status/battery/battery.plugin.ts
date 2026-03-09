import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useBatteryStore } from '@/elements/status/battery/batteryElement'
import BatterySettings from '@/elements/status/battery/batterySettings.vue'
import type { BatteryElementConfig } from '@/types/elements/battery'

export default function registerBatteryPlugin() {
  registerElement('battery' as ElementType, {
    add: (config) => {
      const store = useBatteryStore()
      return store.addElement(config as BatteryElementConfig)
    },
    update: (element, patch) => {
      const store = useBatteryStore()
      store.updateElement(element as any, patch as Partial<BatteryElementConfig>)
    },
    encode: (element) => {
      const store = useBatteryStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useBatteryStore()
      return store.decodeConfig(config as BatteryElementConfig)
    },
  })

  registerSettings('battery' as ElementType, BatterySettings)
}

import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useBatteryStore } from '@/elements/status/battery/batteryElement'
import BatterySettings from '@/elements/status/battery/batterySettings.vue'
import type { BatteryElementConfig } from '@/types/elements/battery'
import { useElementDataStore } from '@/stores/elementDataStore'

export default function registerBatteryPlugin() {
  registerElement('battery' as ElementType, {
    add: (config) => {
      const store = useBatteryStore()
      const element = store.addElement(config as BatteryElementConfig)

      // 使用 engine 内部逻辑生成一份规范化、完整的配置，并写入 ElementDataStore
      try {
        const fullConfig = store.encodeConfig(element as any)
        const elementDataStore = useElementDataStore()
        elementDataStore.upsertElement(fullConfig as any)
      } catch (e) {
        console.warn('[battery.plugin] failed to encode & upsert element config after add', e)
      }

      return element
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

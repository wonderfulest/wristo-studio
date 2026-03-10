import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { BatteryElementConfig } from '@/types/elements/battery'
import { useElementDataStore } from '@/stores/elementDataStore'
import { createBattery, updateBattery } from '@/elements/status/battery/battery.renderer'
import { encodeBattery, decodeBattery } from '@/elements/status/battery/battery.encoder'
import BatteryPanel from '@/elements/status/battery/battery.panel.vue'

export default function registerBatteryPlugin() {
  registerElement('battery' as ElementType, {
    add: (config) => {
      console.debug('[battery.plugin:add] incoming config', config)
      const element = createBattery(config as BatteryElementConfig)

      console.debug('[battery.plugin:add] created element', {
        id: (element as any)?.id,
        eleType: (element as any)?.eleType,
        type: typeof element,
      })

      // 使用 renderer/encoder 生成一份规范化、完整的配置，并写入 ElementDataStore
      try {
        const fullConfig = encodeBattery(element as any)
        const elementDataStore = useElementDataStore()
        elementDataStore.upsertElement(fullConfig as any)
        console.debug('[battery.plugin:add] upserted element config', fullConfig)
      } catch (e) {
        console.warn('[battery.plugin] failed to encode & upsert element config after add', e)
      }

      return element
    },
    update: (element, patch) => {
      return updateBattery(element as any, patch as Partial<BatteryElementConfig>)
    },
    encode: (element) => {
      return encodeBattery(element as any)
    },
    decode: (config) => {
      return decodeBattery(config as BatteryElementConfig)
    },
  })

  registerSettings('battery' as ElementType, BatteryPanel)
}

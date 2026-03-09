import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useAlarmsStore } from '@/elements/indicators/alarms/alarmsElement'
import AlarmsSettings from '@/elements/indicators/alarms/alarmsSettings.vue'
import type { IndicatorElementConfig } from '@/types/elements'

export default function registerAlarmsPlugin() {
  registerElement('alarms' as ElementType, {
    add: (config) => {
      const store = useAlarmsStore()
      return store.addElement(config as IndicatorElementConfig)
    },
    update: (element, patch) => {
      const store = useAlarmsStore()
      store.updateElement(element as any, patch as Partial<IndicatorElementConfig>)
    },
    encode: (element) => {
      const store = useAlarmsStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useAlarmsStore()
      return store.decodeConfig(config as IndicatorElementConfig)
    },
  })

  registerSettings('alarms' as ElementType, AlarmsSettings)
}

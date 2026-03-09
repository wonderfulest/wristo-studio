import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useNotificationStore } from '@/elements/indicators/notification/notificationElement'
import NotificationSettings from '@/elements/indicators/notification/notificationSettings.vue'
import type { IndicatorElementConfig } from '@/types/elements'

export default function registerNotificationPlugin() {
  registerElement('notification' as ElementType, {
    add: (config) => {
      const store = useNotificationStore()
      return store.addElement(config as IndicatorElementConfig)
    },
    update: (element, patch) => {
      const store = useNotificationStore()
      store.updateElement(element as any, patch as Partial<IndicatorElementConfig>)
    },
    encode: (element) => {
      const store = useNotificationStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useNotificationStore()
      return store.decodeConfig(config as IndicatorElementConfig)
    },
  })

  registerSettings('notification' as ElementType, NotificationSettings)
}

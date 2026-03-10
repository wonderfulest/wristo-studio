import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import NotificationPanel from '@/elements/indicators/notification/notification.panel.vue'
import type { IndicatorElementConfig } from '@/types/elements'
import { createIndicatorText, updateIndicatorText } from '@/elements/indicators/common/indicatorText.renderer'
import { encodeIndicatorText, decodeIndicatorText } from '@/elements/indicators/common/indicatorText.encoder'

export default function registerNotificationPlugin() {
  registerElement('notification' as ElementType, {
    add: (config) => {
      // 固定 glyph '\u0025'，表示通知图标
      return createIndicatorText('notification', '\u0025', config as IndicatorElementConfig)
    },
    update: (element, patch) => {
      return updateIndicatorText('notification', element as any, patch as Partial<IndicatorElementConfig>)
    },
    encode: (element) => {
      return encodeIndicatorText('notification', element as any)
    },
    decode: (config) => {
      return decodeIndicatorText('notification', config as IndicatorElementConfig)
    },
  })

  registerSettings('notification' as ElementType, NotificationPanel)
}

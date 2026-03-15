import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import AlarmsPanel from '@/elements/indicators/alarms/alarms.panel.vue'
import type { IndicatorElementConfig } from '@/types/elements'
import { createIndicatorText, updateIndicatorText } from '@/elements/indicators/common/indicatorText.renderer'
import { encodeIndicatorText, decodeIndicatorText } from '@/elements/indicators/common/indicatorText.encoder'

export default function registerAlarmsPlugin() {
  registerElement('alarms' as ElementType, {
    add: (config) => {
      // 固定 glyph '\u0024'，表示闹钟图标
      return createIndicatorText('alarms', '\u0024', config as IndicatorElementConfig)
    },
    update: (element, patch) => {
      return updateIndicatorText('alarms', element as any, patch as Partial<IndicatorElementConfig>)
    },
    encode: (element) => {
      return encodeIndicatorText('alarms', element as any)
    },
    decode: (config) => {
      return decodeIndicatorText('alarms', config as IndicatorElementConfig)
    },
  })

  registerSettings('alarms' as ElementType, AlarmsPanel)
}

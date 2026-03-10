import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import DisturbPanel from '@/elements/indicators/disturb/disturb.panel.vue'
import type { IndicatorElementConfig } from '@/types/elements'
import { createIndicatorText, updateIndicatorText } from '@/elements/indicators/common/indicatorText.renderer'
import { encodeIndicatorText, decodeIndicatorText } from '@/elements/indicators/common/indicatorText.encoder'

export default function registerDisturbPlugin() {
  registerElement('disturb' as ElementType, {
    add: (config) => {
      // 固定 glyph '\u0021'，表示免打扰图标
      return createIndicatorText('disturb', '\u0021', config as IndicatorElementConfig)
    },
    update: (element, patch) => {
      return updateIndicatorText('disturb', element as any, patch as Partial<IndicatorElementConfig>)
    },
    encode: (element) => {
      return encodeIndicatorText('disturb', element as any)
    },
    decode: (config) => {
      return decodeIndicatorText('disturb', config as IndicatorElementConfig)
    },
  })

  registerSettings('disturb' as ElementType, DisturbPanel)
}

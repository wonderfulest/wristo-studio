import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { IndicatorElementConfig } from '@/types/elements'
import { createIndicatorText, updateIndicatorText } from '@/elements/indicators/common/indicatorText.renderer'
import { encodeIndicatorText, decodeIndicatorText } from '@/elements/indicators/common/indicatorText.encoder'
import BluetoothPanel from '@/elements/indicators/bluetooth/bluetooth.panel.vue'

export default function registerBluetoothPlugin() {
  registerElement('bluetooth' as ElementType, {
    add: (config) => {
      // 固定 glyph '\u0022'，表示蓝牙图标
      return createIndicatorText('bluetooth', '\u0022', config as IndicatorElementConfig)
    },
    update: (element, patch) => {
      return updateIndicatorText('bluetooth', element as any, patch as Partial<IndicatorElementConfig>)
    },
    encode: (element) => {
      return encodeIndicatorText('bluetooth', element as any)
    },
    decode: (config) => {
      return decodeIndicatorText('bluetooth', config as IndicatorElementConfig)
    },
  })

  registerSettings('bluetooth' as ElementType, BluetoothPanel)
}

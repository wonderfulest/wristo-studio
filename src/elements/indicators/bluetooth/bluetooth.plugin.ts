import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { IndicatorElementConfig } from '@/types/elements'
import { createBluetooth, updateBluetooth } from '@/elements/indicators/bluetooth/bluetooth.renderer'
import { encodeBluetooth, decodeBluetooth } from '@/elements/indicators/bluetooth/bluetooth.encoder'
import BluetoothPanel from '@/elements/indicators/bluetooth/bluetooth.panel.vue'

export default function registerBluetoothPlugin() {
  registerElement('bluetooth' as ElementType, {
    add: (config) => {
      return createBluetooth(config as IndicatorElementConfig)
    },
    update: (element, patch) => {
      updateBluetooth(element as any, patch as Partial<IndicatorElementConfig>)
    },
    encode: (element) => {
      return encodeBluetooth(element as any)
    },
    decode: (config) => {
      return decodeBluetooth(config as IndicatorElementConfig)
    },
  })

  registerSettings('bluetooth' as ElementType, BluetoothPanel)
}

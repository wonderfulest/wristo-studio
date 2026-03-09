import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useBluetoothStore } from '@/elements/indicators/bluetooth/bluetoothElement'
import BluetoothSettings from '@/elements/indicators/bluetooth/bluetoothSettings.vue'
import type { IndicatorElementConfig } from '@/types/elements'

export default function registerBluetoothPlugin() {
  registerElement('bluetooth' as ElementType, {
    add: (config) => {
      const store = useBluetoothStore()
      return store.addElement(config as IndicatorElementConfig)
    },
    update: (element, patch) => {
      const store = useBluetoothStore()
      store.updateElement(element as any, patch as Partial<IndicatorElementConfig>)
    },
    encode: (element) => {
      const store = useBluetoothStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useBluetoothStore()
      return store.decodeConfig(config as IndicatorElementConfig)
    },
  })

  registerSettings('bluetooth' as ElementType, BluetoothSettings)
}

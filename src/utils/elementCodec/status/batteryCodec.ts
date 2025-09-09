import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useBatteryStore } from '@/stores/elements/status/batteryElement'
import type { BatteryElementConfig } from '@/types/elements'
import type { FabricElement } from '@/types/element'

const encodeBattery: EncoderFn<'battery'> = (element: FabricElement) => {
  const store = useBatteryStore()
  return store.encodeConfig(element)
}

const decodeBattery: DecoderFn<'battery'> = (config: BatteryElementConfig) => {
  const store = useBatteryStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn<'battery'> = (_elementType, config: BatteryElementConfig) => {
  const store = useBatteryStore()
  return store.addElement(config)
}

export default () => {
  registerEncoder('battery', encodeBattery)
  registerDecoder('battery', decodeBattery)
  registerAddElement('battery', addElement)
}

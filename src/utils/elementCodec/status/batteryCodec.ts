import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useBatteryStore } from '@/stores/elements/status/batteryElement'

const encodeBattery: EncoderFn = (element: any) => {
  const store = useBatteryStore()
  return store.encodeConfig(element)
}

const decodeBattery: DecoderFn = (config: any) => {
  const store = useBatteryStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn = (_elementType, config: any) => {
  const store = useBatteryStore()
  store.addElement(config)
}

export default () => {
  registerEncoder('battery', encodeBattery)
  registerDecoder('battery', decodeBattery)
  registerAddElement('battery', addElement)
}

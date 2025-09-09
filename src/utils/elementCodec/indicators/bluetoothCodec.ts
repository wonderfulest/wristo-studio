import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useBluetoothStore } from '@/stores/elements/indicators/bluetoothElement'
import type { FabricElement } from '@/types/element'
import type { IndicatorElementConfig } from '@/types/elements'

const encodeBluetooth: EncoderFn<'bluetooth'> = (element: FabricElement) => {
  const store = useBluetoothStore()
  return store.encodeConfig(element)
}

const decodeBluetooth: DecoderFn<'bluetooth'> = (config: IndicatorElementConfig) => {
  const store = useBluetoothStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn<'bluetooth'> = (_elementType, config: IndicatorElementConfig) => {
  const store = useBluetoothStore()
  return store.addElement(config)
}

export default () => {
  registerEncoder('bluetooth', encodeBluetooth)
  registerDecoder('bluetooth', decodeBluetooth)
  registerAddElement('bluetooth', addElement)
}

import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useBluetoothStore } from '@/stores/elements/indicators/bluetoothElement'

const encodeBluetooth: EncoderFn = (element: any) => {
  const store = useBluetoothStore()
  return store.encodeConfig(element)
}

const decodeBluetooth: DecoderFn = (config: any) => {
  const store = useBluetoothStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn = (_elementType, config: any) => {
  const store = useBluetoothStore()
  store.addElement(config)
}

export default () => {
  registerEncoder('bluetooth', encodeBluetooth)
  registerDecoder('bluetooth', decodeBluetooth)
  registerAddElement('bluetooth', addElement)
}

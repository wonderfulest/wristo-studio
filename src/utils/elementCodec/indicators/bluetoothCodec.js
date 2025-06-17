import { ref } from 'vue'
import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useBluetoothStore } from '@/stores/elements/indicators/bluetoothElement'

// 蓝牙编码器
const encodeBluetooth = (element) => {
  const bluetoothStore = useBluetoothStore()
  return bluetoothStore.encodeConfig(element)
}

// 蓝牙解码器
const decodeBluetooth = (encoded) => {
  const bluetoothStore = useBluetoothStore()
  return bluetoothStore.decodeConfig(encoded)
}

const addElement = (config) => {
  const bluetoothStore = useBluetoothStore()
  bluetoothStore.addElement(config)
}

export default () => {
  registerEncoder('bluetooth', encodeBluetooth)
  registerDecoder('bluetooth', decodeBluetooth)
  registerAddElement('bluetooth', addElement)
} 
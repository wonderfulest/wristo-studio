import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useBatteryStore } from '@/stores/elements/status/batteryElement'

const addElement = (config) => {
  const batteryStore = useBatteryStore()
  batteryStore.addElement(config)
}
// 电池编码器
const encodeBattery = (element) => {
  const batteryStore = useBatteryStore()
  return batteryStore.encodeConfig(element)
}

// 电池解码器
const decodeBattery = (encoded) => {
  const batteryStore = useBatteryStore()
  return batteryStore.decodeConfig(encoded)
}

export default () => {
  registerEncoder('battery', encodeBattery)
  registerDecoder('battery', decodeBattery)
  registerAddElement('battery', addElement)
} 
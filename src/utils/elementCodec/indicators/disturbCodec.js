import { ref } from 'vue'
import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useDisturbStore } from '@/stores/elements/indicators/disturbElement'

// 勿扰编码器
const encodeDisturb = (element) => {
  const disturbStore = useDisturbStore()
  return disturbStore.encodeConfig(element)
}

// 勿扰解码器
const decodeDisturb = (encoded) => {
  const disturbStore = useDisturbStore()
  return disturbStore.decodeConfig(encoded)
}

const addElement = (config) => {
  const disturbStore = useDisturbStore()
  disturbStore.addElement(config)
}

export default () => {
  registerEncoder('disturb', encodeDisturb)
  registerDecoder('disturb', decodeDisturb)
  registerAddElement('disturb', addElement)
} 
import { ref } from 'vue'
import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useAlarmsStore } from '@/stores/elements/indicators/alarmsElement'

// 闹钟编码器
const encodeAlarms = (element) => {
  const alarmsStore = useAlarmsStore()
  return alarmsStore.encodeConfig(element)
}

// 闹钟解码器
const decodeAlarms = (encoded) => {
  const alarmsStore = useAlarmsStore()
  return alarmsStore.decodeConfig(encoded)
}

const addElement = (config) => {
  const alarmsStore = useAlarmsStore()
  alarmsStore.addElement(config)
}

export default () => {
  registerEncoder('alarms', encodeAlarms)
  registerDecoder('alarms', decodeAlarms)
  registerAddElement('alarms', addElement)
} 
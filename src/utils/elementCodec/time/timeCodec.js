import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useTimeStore } from '@/stores/elements/time/timeElement'

// 时间元素添加器
const addElement = (config) => {
  const timeStore = useTimeStore()
  timeStore.addElement(config)
}

// 时间编码器
const timeEncoder = (element) => {
  const timeStore = useTimeStore()
  return timeStore.encodeConfig(element)
}

// 时间解码器
const timeDecoder = (config) => {
  const timeStore = useTimeStore()
  return timeStore.decodeConfig(config)
}

export default () => {
  registerEncoder('time', timeEncoder)
  registerDecoder('time', timeDecoder)
  registerAddElement('time', addElement)
} 
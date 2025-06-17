import { ref } from 'vue'
import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useDateStore } from '@/stores/elements/time/dateElement'

// 日期元素添加器
const addElement = (config) => {
  const dateStore = useDateStore()
  dateStore.addElement(config)
}

// 日期编码器
const dateEncoder = (element) => {
  const dateStore = useDateStore()
  return dateStore.encodeConfig(element)
}

// 日期解码器
const dateDecoder = (config) => {
  const dateStore = useDateStore()
  return dateStore.decodeConfig(config)
}

export default () => {
  registerEncoder('date', dateEncoder)
  registerDecoder('date', dateDecoder)
  registerAddElement('date', addElement)
} 
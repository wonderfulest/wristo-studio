import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useLabelStore } from '@/stores/elements/data/labelElement'

const addElement = (config) => {
  const labelStore = useLabelStore()
  labelStore.addElement(config)
}

// 标签编码器
const labelEncoder = (element) => {
  const labelStore = useLabelStore()
  return labelStore.encodeConfig(element)
}

// 标签解码器
const labelDecoder = (element) => {
  const labelStore = useLabelStore()
  return labelStore.decodeConfig(element)
}

// 默认导出函数，用于自动注册
export default () => {
  registerEncoder('label', labelEncoder)
  registerDecoder('label', labelDecoder)
  registerAddElement('label', addElement)
} 
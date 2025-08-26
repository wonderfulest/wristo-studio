import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useLineElementStore } from '@/stores/elements/shapes/lineElement'

// 直线编码器
const encodeLine = (element) => {
  const lineStore = useLineElementStore()
  return lineStore.encodeConfig(element)
}

// 直线解码器
const decodeLine = (config) => {
  const lineStore = useLineElementStore()
  return lineStore.decodeConfig(config)
}

// 添加直线元素
const addElement = (config) => {
  const lineStore = useLineElementStore()
  return lineStore.addElement(config)
}

// 默认导出函数，用于自动注册
export default () => {
  registerEncoder('line', encodeLine)
  registerDecoder('line', decodeLine)
  registerAddElement('line', addElement)
}
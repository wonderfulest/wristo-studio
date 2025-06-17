import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useRectangleStore } from '@/stores/elements/shapes/rectangleElement'

// 矩形编码器
const encodeRectangle = (element) => {
  const rectangleStore = useRectangleStore()
  return rectangleStore.encodeConfig(element)
}

// 矩形解码器
const decodeRectangle = (config) => {
  const rectangleStore = useRectangleStore()
  return rectangleStore.decodeConfig(config)
}

// 添加矩形元素
const addElement = (config) => {
  const rectangleStore = useRectangleStore()
  return rectangleStore.addElement(config)
}

// 默认导出函数，用于自动注册
export default () => {
  registerEncoder('rectangle', encodeRectangle)
  registerDecoder('rectangle', decodeRectangle)
  registerAddElement('rectangle', addElement)
}

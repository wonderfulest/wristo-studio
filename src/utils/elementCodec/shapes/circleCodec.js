import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useCircleStore } from '@/stores/elements/shapes/circleElement'

// 圆形编码器
const encodeCircle = (element) => {
  const circleStore = useCircleStore()
  return circleStore.encodeConfig(element)
}

// 圆形解码器
const decodeCircle = (config) => {
  const circleStore = useCircleStore()
  return circleStore.decodeConfig(config)
}

// 添加圆形元素
const addElement = (config) => {
  const circleStore = useCircleStore()
  return circleStore.addElement(config)
}

// 默认导出函数，用于自动注册
export default () => {
  registerEncoder('circle', encodeCircle)
  registerDecoder('circle', decodeCircle)
  registerAddElement('circle', addElement)
}

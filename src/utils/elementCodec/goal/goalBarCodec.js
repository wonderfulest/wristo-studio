import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useGoalBarStore } from '@/stores/elements/goal/goalBarElement'

// 进度条编码器
const goalBarEncoder = (element) => {
  const goalBarStore = useGoalBarStore()
  return goalBarStore.encodeConfig(element)
}

// 进度条解码器
const goalBarDecoder = (element) => {
  const goalBarStore = useGoalBarStore()
  return goalBarStore.decodeConfig(element)
}

// 添加进度条元素
const addElement = (config) => {
  const goalBarStore = useGoalBarStore()
  return goalBarStore.addElement(config)
}

// 默认导出函数，用于自动注册
export default () => {
  registerEncoder('goalBar', goalBarEncoder)
  registerDecoder('goalBar', goalBarDecoder)
  registerAddElement('goalBar', addElement)
}
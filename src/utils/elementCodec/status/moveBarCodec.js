import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useMoveBarStore } from '@/stores/elements/status/moveBarElement'

// 添加元素
const addElement = (config) => {
  const moveBarStore = useMoveBarStore()
  moveBarStore.addElement(config)
}

// 编码器
const encodeMoveBar = (element) => {
  const moveBarStore = useMoveBarStore()
  return moveBarStore.encodeConfig(element)
}

// 解码器
const decodeMoveBar = (config) => {
  const moveBarStore = useMoveBarStore()
  return moveBarStore.decodeConfig(config)
}

// 默认导出函数，用于自动注册
export default () => {
  registerEncoder('moveBar', encodeMoveBar)
  registerDecoder('moveBar', decodeMoveBar)
  registerAddElement('moveBar', addElement)
} 
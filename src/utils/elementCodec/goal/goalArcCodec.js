import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useGoalArcStore } from '@/stores/elements/goal/goalArcElement'

// 进度环编码器
const encodeGoalArc = (element) => {
  const goalArcStore = useGoalArcStore()
  return goalArcStore.encodeConfig(element)
}

// 进度环解码器
const decodeGoalArc = (encoded) => {
  const goalArcStore = useGoalArcStore()
  return goalArcStore.decodeConfig(encoded)
}

const addElement = (config) => {
  const goalArcStore = useGoalArcStore()
  goalArcStore.addElement(config)
}

export default () => {
  registerEncoder('goalArc', encodeGoalArc)
  registerDecoder('goalArc', decodeGoalArc)
  registerAddElement('goalArc', addElement)
}

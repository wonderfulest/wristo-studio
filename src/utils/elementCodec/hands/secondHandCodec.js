import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useSecondHandStore } from '@/stores/elements/hands/secondHandElement'

// 进度环编码器
const encodeSecondHand = (element) => {
  const secondHandStore = useSecondHandStore()
  return secondHandStore.encodeConfig(element)
}

// 进度环解码器
const decodeSecondHand = (encoded) => {
  const secondHandStore = useSecondHandStore()
  return secondHandStore.decodeConfig(encoded)
}

const addElement = (config) => {
  const secondHandStore = useSecondHandStore()
  secondHandStore.addElement(config)
}

export default () => {
  registerEncoder('secondHand', encodeSecondHand)
  registerDecoder('secondHand', decodeSecondHand)
  registerAddElement('secondHand', addElement)
}

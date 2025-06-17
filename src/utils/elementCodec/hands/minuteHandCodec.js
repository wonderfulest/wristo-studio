import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useMinuteHandStore } from '@/stores/elements/hands/minuteHandElement'

// 进度环编码器
const encodeMinuteHand = (element) => {
  const minuteHandStore = useMinuteHandStore()
  return minuteHandStore.encodeConfig(element)
}

// 进度环解码器
const decodeMinuteHand = (encoded) => {
  const minuteHandStore = useMinuteHandStore()
  return minuteHandStore.decodeConfig(encoded)
}

const addElement = (config) => {
  const minuteHandStore = useMinuteHandStore()
  minuteHandStore.addElement(config)
}

export default () => {
  registerEncoder('minuteHand', encodeMinuteHand)
  registerDecoder('minuteHand', decodeMinuteHand)
  registerAddElement('minuteHand', addElement)
}

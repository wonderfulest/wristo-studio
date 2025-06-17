import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useHourHandStore } from '@/stores/elements/hands/hourHandElement'

// 进度环编码器
const encodeHourHand = (element) => {
  const hourHandStore = useHourHandStore()
  return hourHandStore.encodeConfig(element)
}

// 进度环解码器
const decodeHourHand = (encoded) => {
  const hourHandStore = useHourHandStore()
  return hourHandStore.decodeConfig(encoded)
}

const addElement = (config) => {
  const hourHandStore = useHourHandStore()
  hourHandStore.addElement(config)
}

export default () => {
  registerEncoder('hourHand', encodeHourHand)
  registerDecoder('hourHand', decodeHourHand)
  registerAddElement('hourHand', addElement)
}

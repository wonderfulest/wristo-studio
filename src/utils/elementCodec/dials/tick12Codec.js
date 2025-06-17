import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useTick12Store } from '@/stores/elements/dials/Tick12Element'

// 进度环编码器
const encodeTick12 = (element) => {
  const tick12Store = useTick12Store()
  return tick12Store.encodeConfig(element)
}

// 进度环解码器
const decodeTick12 = (encoded) => {
  const tick12Store = useTick12Store()
  return tick12Store.decodeConfig(encoded)
}

const addElement = (config) => {
  const tick12Store = useTick12Store()
  tick12Store.addElement(config)
}

export default () => {
  registerEncoder('tick12', encodeTick12)
  registerDecoder('tick12', decodeTick12)
  registerAddElement('tick12', addElement)
}

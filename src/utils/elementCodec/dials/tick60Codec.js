import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useTick60Store } from '@/stores/elements/dials/Tick60Element'

// 进度环编码器
const encodeTick60 = (element) => {
  const tick60Store = useTick60Store()
  return tick60Store.encodeConfig(element)
}

// 进度环解码器
const decodeTick60 = (encoded) => {
  const tick60Store = useTick60Store()
  return tick60Store.decodeConfig(encoded)
}

const addElement = (config) => {
  const tick60Store = useTick60Store()
  tick60Store.addElement(config)
}

export default () => {
  registerEncoder('tick60', encodeTick60)
  registerDecoder('tick60', decodeTick60)
  registerAddElement('tick60', addElement)
}

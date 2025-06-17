import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useRomansStore } from '@/stores/elements/dials/RomansElement'

// 进度环编码器
const encodeRomans = (element) => {
  const romansStore = useRomansStore()
  return romansStore.encodeConfig(element)
}

// 进度环解码器
const decodeRomans = (encoded) => {
  const romansStore = useRomansStore()
  return romansStore.decodeConfig(encoded)
}

const addElement = (config) => {
  const romansStore = useRomansStore()
  romansStore.addElement(config)
}

export default () => {
  registerEncoder('romans', encodeRomans)
  registerDecoder('romans', decodeRomans)
  registerAddElement('romans', addElement)
}

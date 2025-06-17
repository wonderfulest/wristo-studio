import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import { useIconStore } from '@/stores/elements/data/iconElement'

// 图标编码器
const iconEncoder = (element) => {
  const iconStore = useIconStore()
  return iconStore.encodeConfig(element)
}

// 图标解码器
const iconDecoder = (element) => {
  const iconStore = useIconStore()
  return iconStore.decodeConfig(element)
}

const addElement = (config) => {
  const iconStore = useIconStore()
  iconStore.addElement(config)
}

export default () => {
  registerEncoder('icon', iconEncoder)
  registerDecoder('icon', iconDecoder)
  registerAddElement('icon', addElement)
}
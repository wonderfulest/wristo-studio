import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useIconStore } from '@/stores/elements/data/iconElement'
import type { FabricElement } from '@/types/element'
import type { IconElementConfig } from '@/types/elements'

// 图标编码器
const encodeIcon: EncoderFn<'icon'> = (element: FabricElement) => {
  const iconStore = useIconStore()
  const config = iconStore.encodeConfig(element)
  return config
}

// 图标解码器
const decodeIcon: DecoderFn<'icon'> = (config: IconElementConfig) => {
  const iconStore = useIconStore()
  return iconStore.decodeConfig(config)
}

// 添加元素
const addElement: AddElementFn<'icon'> = (_elementType: 'icon', config: IconElementConfig): Promise<FabricElement> => {
  const iconStore = useIconStore()
  return iconStore.addElement(config)
}

export default () => {
  registerEncoder('icon', encodeIcon)
  registerDecoder('icon', decodeIcon)
  registerAddElement('icon', addElement)
}

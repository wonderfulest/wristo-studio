import { registerAddElement, registerEncoder, registerDecoder } from '../registry'
import type { AddElementFn, EncoderFn, DecoderFn } from '../registry'
import { useTextStore } from '@/stores/elements/texts/textElement'
import type { FabricElement } from '@/types/element'
import type { TextElementConfig } from '@/types/elements'

const addElement: AddElementFn<'text'> = (_elementType: 'text', config: TextElementConfig) => {
  const store = useTextStore()
  return store.addElement({
    text: config.textTemplate ?? '',
    left: config.left,
    top: config.top,
    size: config.fontSize,
    textColor: (config.fill ?? '#FFFFFF') as string,
    fontFamily: config.fontFamily,
    originX: (config.originX ?? 'center') as string,
    originY: (config.originY ?? 'center') as string,
    textProperty: config.textProperty,
  }) as unknown as FabricElement
}

// 将画布上的 text 元素编码为通用 TextElementConfig
const encodeText: EncoderFn<'text'> = (element: FabricElement) => {
  const store = useTextStore()
  return store.encodeConfig(element)
}

// 从 TextElementConfig 解码为 FabricElement 的部分属性（用于还原）
const decodeText: DecoderFn<'text'> = (config: TextElementConfig) => {
  const store = useTextStore()
  return store.decodeConfig(config) as FabricElement
}

export default () => {
  registerEncoder('text', encodeText)
  registerDecoder('text', decodeText)
  registerAddElement('text', addElement)
}

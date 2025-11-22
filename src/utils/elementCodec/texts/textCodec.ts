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
  }) as unknown as FabricElement
}

// 将画布上的 text 元素编码为通用 TextElementConfig
const encodeText: EncoderFn<'text'> = (element: FabricElement) => {
  const fabricAny = element as any
  const config: TextElementConfig = {
    id: fabricAny.id ?? '',
    eleType: 'text',
    left: typeof element.left === 'number' ? element.left : 0,
    top: typeof element.top === 'number' ? element.top : 0,
    originX: (element as any).originX ?? 'center',
    originY: (element as any).originY ?? 'center',
    fill: (element as any).fill ?? '#FFFFFF',
    fontFamily: fabricAny.fontFamily ?? '',
    fontSize: typeof fabricAny.fontSize === 'number' ? fabricAny.fontSize : 18,
    textTemplate: typeof fabricAny.textTemplate === 'string'
      ? fabricAny.textTemplate
      : (typeof fabricAny.text === 'string' ? fabricAny.text : ''),
  }
  return config
}

// 从 TextElementConfig 解码为 FabricElement 的部分属性（用于还原）
const decodeText: DecoderFn<'text'> = (config: TextElementConfig) => {
  const textTemplate = config.textTemplate ?? ''
  return {
    eleType: 'text',
    left: config.left,
    top: config.top,
    originX: config.originX,
    originY: config.originY,
    fill: config.fill,
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    textTemplate,
    text: textTemplate,
  } as unknown as FabricElement
}

export default () => {
  registerEncoder('text', encodeText)
  registerDecoder('text', decodeText)
  registerAddElement('text', addElement)
}

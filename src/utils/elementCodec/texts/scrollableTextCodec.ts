import { registerAddElement, registerEncoder, registerDecoder } from '../registry'
import type { AddElementFn, EncoderFn, DecoderFn } from '../registry'
import { useScrollableTextStore } from '@/stores/elements/texts/scrollableTextElement'
import type { FabricElement } from '@/types/element'
import type { TextElementConfig } from '@/types/elements'

const addElement: AddElementFn<'scrollableText'> = (_elementType: 'scrollableText', config: TextElementConfig) => {
  const store = useScrollableTextStore()
  const element = store.addElement({
    text: config.textTemplate ?? '',
    left: config.left,
    top: config.top,
    size: config.fontSize,
    textColor: (config.fill ?? '#FFFFFF') as string,
    fontFamily: config.fontFamily,
    originX: (config.originX ?? 'center') as string,
    originY: (config.originY ?? 'center') as string,
    scrollAreaWidth: typeof config.scrollAreaWidth === 'number' ? config.scrollAreaWidth : 454,
    scrollAreaLeft: typeof config.scrollAreaLeft === 'number' ? config.scrollAreaLeft : 227,
    scrollAreaTop: typeof config.scrollAreaTop === 'number' ? config.scrollAreaTop : 227,
    scrollAreaBackground: (config as any).scrollAreaBackground,
    textProperty: config.textProperty,
  }) as unknown as FabricElement

  ;(element as any).eleType = 'scrollableText'
  store.startScrollableAnimation(element as any)

  return element
}

const encodeScrollableText: EncoderFn<'scrollableText'> = (element: FabricElement) => {
  const store = useScrollableTextStore()
  return store.encodeConfig(element)
}

const decodeScrollableText: DecoderFn<'scrollableText'> = (config: TextElementConfig) => {
  const store = useScrollableTextStore()
  return store.decodeConfig(config) as FabricElement
}

export default () => {
  registerEncoder('scrollableText', encodeScrollableText)
  registerDecoder('scrollableText', decodeScrollableText)
  registerAddElement('scrollableText', addElement)
}

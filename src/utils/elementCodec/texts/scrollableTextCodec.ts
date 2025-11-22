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
  }) as unknown as FabricElement

  ;(element as any).eleType = 'scrollableText'
  store.startScrollableAnimation(element as any)

  return element
}

const encodeScrollableText: EncoderFn<'scrollableText'> = (element: FabricElement) => {
  const fabricAny = element as any
  const config: TextElementConfig = {
    id: fabricAny.id ?? '',
    eleType: 'scrollableText',
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

const decodeScrollableText: DecoderFn<'scrollableText'> = (config: TextElementConfig) => {
  const textTemplate = config.textTemplate ?? ''
  return {
    eleType: 'scrollableText',
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
  registerEncoder('scrollableText', encodeScrollableText)
  registerDecoder('scrollableText', decodeScrollableText)
  registerAddElement('scrollableText', addElement)
}

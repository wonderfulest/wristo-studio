import { registerAddElement, registerEncoder, registerDecoder } from '../registry'
import type { AddElementFn, EncoderFn, DecoderFn } from '../registry'
import { useAngledTextStore } from '@/stores/elements/texts/angledTextElement'
import type { FabricElement } from '@/types/element'
import type { TextElementConfig } from '@/types/elements'

const addElement: AddElementFn<'angledText'> = (_elementType: 'angledText', config: TextElementConfig) => {
  const store = useAngledTextStore()
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

  const anyEl = element as any
  anyEl.eleType = 'angledText'
  anyEl.angle = typeof anyEl.angle === 'number' ? anyEl.angle : -45

  return element
}

const encodeAngledText: EncoderFn<'angledText'> = (element: FabricElement) => {
  const fabricAny = element as any
  const config: TextElementConfig = {
    id: fabricAny.id ?? '',
    eleType: 'angledText',
    left: typeof element.left === 'number' ? element.left : 0,
    top: typeof element.top === 'number' ? element.top : 0,
    originX: (element as any).originX ?? 'center',
    originY: (element as any).originY ?? 'center',
    fill: (element as any).fill ?? '#FFFFFF',
    fontFamily: fabricAny.fontFamily ?? '',
    fontSize: typeof fabricAny.fontSize === 'number' ? fabricAny.fontSize : 18,
    angle: typeof fabricAny.angle === 'number' ? fabricAny.angle : -45,
    textTemplate: typeof fabricAny.textTemplate === 'string'
      ? fabricAny.textTemplate
      : (typeof fabricAny.text === 'string' ? fabricAny.text : ''),
  }
  return config
}

const decodeAngledText: DecoderFn<'angledText'> = (config: TextElementConfig) => {
  const textTemplate = config.textTemplate ?? ''
  return {
    eleType: 'angledText',
    left: config.left,
    top: config.top,
    originX: config.originX,
    originY: config.originY,
    fill: config.fill,
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    textTemplate,
    text: textTemplate,
    angle: typeof config.angle === 'number' ? config.angle : -45,
  } as unknown as FabricElement
}

export default () => {
  registerEncoder('angledText', encodeAngledText)
  registerDecoder('angledText', decodeAngledText)
  registerAddElement('angledText', addElement)
}

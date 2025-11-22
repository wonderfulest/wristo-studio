import { registerAddElement, registerEncoder, registerDecoder } from '../registry'
import type { AddElementFn, EncoderFn, DecoderFn } from '../registry'
import { useRadialTextStore } from '@/stores/elements/texts/radialTextElement'
import type { FabricElement } from '@/types/element'
import type { TextElementConfig } from '@/types/elements'

const addElement: AddElementFn<'radialText'> = (_elementType: 'radialText', config: TextElementConfig) => {
  const store = useRadialTextStore()
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
  anyEl.eleType = 'radialText'
  // 简单版本：暂不做沿圆弧排版，只保留类型区别

  return element
}

const encodeRadialText: EncoderFn<'radialText'> = (element: FabricElement) => {
  const fabricAny = element as any
  const config: TextElementConfig = {
    id: fabricAny.id ?? '',
    eleType: 'radialText',
    left: typeof element.left === 'number' ? element.left : 0,
    top: typeof element.top === 'number' ? element.top : 0,
    originX: (element as any).originX ?? 'center',
    originY: (element as any).originY ?? 'center',
    fill: (element as any).fill ?? '#FFFFFF',
    fontFamily: fabricAny.fontFamily ?? '',
    fontSize: typeof fabricAny.fontSize === 'number' ? fabricAny.fontSize : 18,
    angle: typeof fabricAny.angle === 'number' ? fabricAny.angle : 0,
    radius: typeof fabricAny.radius === 'number' ? fabricAny.radius : 100,
    direction: fabricAny.direction ?? 'clockwise',
    justification: fabricAny.justification ?? 'center',
    textTemplate: typeof fabricAny.textTemplate === 'string'
      ? fabricAny.textTemplate
      : (typeof fabricAny.text === 'string' ? fabricAny.text : ''),
  }
  return config
}

const decodeRadialText: DecoderFn<'radialText'> = (config: TextElementConfig) => {
  const textTemplate = config.textTemplate ?? ''
  return {
    eleType: 'radialText',
    left: config.left,
    top: config.top,
    originX: config.originX,
    originY: config.originY,
    fill: config.fill,
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    textTemplate,
    text: textTemplate,
    angle: typeof config.angle === 'number' ? config.angle : 0,
    radius: typeof config.radius === 'number' ? config.radius : 100,
    direction: (config as any).direction ?? 'clockwise',
    justification: (config as any).justification ?? 'center',
  } as unknown as FabricElement
}

export default () => {
  registerEncoder('radialText', encodeRadialText)
  registerDecoder('radialText', decodeRadialText)
  registerAddElement('radialText', addElement)
}

import type { FabricElement } from '@/types/element'
import type { TextElementConfig } from '@/types/elements'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'
import { getDataValueByName } from '@/utils/dataSimulator'

export function encodeText(element: FabricElement): TextElementConfig {
  const fabricAny = element as any
  const textTemplate: string =
    typeof fabricAny.textTemplate === 'string'
      ? fabricAny.textTemplate
      : typeof fabricAny.text === 'string'
        ? fabricAny.text
        : ''

  return {
    id: fabricAny.id ?? '',
    eleType: 'text',
    left: typeof element.left === 'number' ? element.left : 0,
    top: typeof element.top === 'number' ? element.top : 0,
    originX: (element as any).originX ?? 'center',
    originY: 'center',
    fill: (element as any).fill ?? '#FFFFFF',
    fontFamily: fabricAny.fontFamily ?? '',
    fontSize: typeof fabricAny.fontSize === 'number' ? fabricAny.fontSize : 18,
    textProperty: fabricAny.textProperty,
    textTemplate,
    topBase: encodeTopBaseForElement(element),
  }
}

export function decodeText(config: TextElementConfig): Partial<FabricElement> {
  const textTemplate = (config as any).textTemplate ?? ''
  const resolvedText = (textTemplate || '').replace(/\{\{([^}]+)\}\}/g, (_m: unknown, p1: string) => {
    const key = String(p1 || '').trim()
    return key ? getDataValueByName(key) : ''
  })

  const element: Partial<FabricElement> = {
    id: config.id,
    eleType: 'text',
    left: config.left,
    top: config.top,
    originX: config.originX,
    originY: 'center',
    fill: config.fill,
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    textProperty: config.textProperty,
    textTemplate,
    text: resolvedText,
  } as any

  return element
}

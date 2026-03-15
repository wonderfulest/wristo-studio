import type { FabricElement } from '@/types/element'
import type { TextElementConfig } from '@/types/elements'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'
import { getDataValueByName } from '@/utils/dataSimulator'

export function encodeScrollableText(element: FabricElement): TextElementConfig {
  const anyEl = element as any

  const config: TextElementConfig = {
    id: anyEl.id ?? '',
    eleType: 'scrollableText',
    left: typeof element.left === 'number' ? element.left : 0,
    top: typeof element.top === 'number' ? element.top : 0,
    originX: anyEl.originX ?? 'center',
    originY: anyEl.originY ?? 'center',
    fill: anyEl.fill ?? '#FFFFFF',
    fontFamily: anyEl.fontFamily ?? '',
    fontSize: typeof anyEl.fontSize === 'number' ? anyEl.fontSize : 18,
    scrollAreaWidth: typeof anyEl.scrollAreaWidth === 'number' ? anyEl.scrollAreaWidth : 454,
    scrollAreaLeft:
      typeof anyEl.scrollAreaLeft === 'number'
        ? anyEl.scrollAreaLeft
        : (typeof element.left === 'number' ? element.left : 227),
    scrollAreaTop:
      typeof anyEl.scrollAreaTop === 'number'
        ? anyEl.scrollAreaTop
        : (typeof element.top === 'number' ? element.top : 0),
    scrollAreaBackground: anyEl.scrollAreaBackground,
    textProperty: anyEl.textProperty,
    textTemplate:
      typeof anyEl.textTemplate === 'string'
        ? anyEl.textTemplate
        : typeof anyEl.text === 'string'
          ? anyEl.text
          : '',
    topBase: encodeTopBaseForElement(element),
  }

  return config
}

export function decodeScrollableText(config: TextElementConfig): Partial<FabricElement> {
  const propertyValue = '' // propertiesStore 无法在此处直接访问，由调用方传入时已决策

  const fallbackTemplate = (config as any).textTemplate ?? ''
  const baseTemplate =
    typeof propertyValue === 'string' && propertyValue !== '' ? propertyValue : fallbackTemplate

  const textTemplate = baseTemplate ?? ''
  const resolvedText = (textTemplate || '').replace(/\{\{([^}]+)\}\}/g, (_m: unknown, p1: string) => {
    const key = String(p1 || '').trim()
    return key ? getDataValueByName(key) : ''
  })

  const element: Partial<FabricElement> = {
    id: config.id,
    eleType: 'scrollableText',
    left: config.left,
    top: config.top,
    originX: 'center',
    originY: config.originY,
    fill: config.fill,
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    scrollAreaWidth: (config as any).scrollAreaWidth,
    scrollAreaLeft: (config as any).scrollAreaLeft,
    scrollAreaTop: (config as any).scrollAreaTop,
    scrollAreaBackground: (config as any).scrollAreaBackground,
    textProperty: config.textProperty,
    textTemplate,
    text: resolvedText,
  } as any

  return element
}

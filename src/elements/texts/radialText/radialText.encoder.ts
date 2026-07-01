import type { FabricElement } from '@/types/element'
import type { TextElementConfig } from '@/types/elements'

export function encodeRadialText(element: FabricElement): TextElementConfig {
  if (!element) {
    throw new Error('Invalid element')
  }

  const anyEl = element as any
  const textTemplate: string =
    typeof anyEl.textTemplate === 'string'
      ? anyEl.textTemplate
      : typeof anyEl.text === 'string'
        ? anyEl.text
        : ''

  const config: TextElementConfig = {
    id: anyEl.id ?? '',
    eleType: 'radialText',
    left: typeof anyEl.left === 'number' ? anyEl.left : 0,
    top: typeof anyEl.top === 'number' ? anyEl.top : 0,
    originX: anyEl.originX ?? 'center',
    originY: anyEl.originY ?? 'center',
    fill: anyEl.fill ?? '#FFFFFF',
    fontFamily: anyEl.fontFamily ?? 'Noto Sans SC',
    fontSize: typeof anyEl.fontSize === 'number' ? anyEl.fontSize : 36,
    textTemplate,
    localizedText: anyEl.localizedText,
    localization: anyEl.localization,
    textProperty: anyEl.textProperty,
    angle:
      typeof anyEl.startAngle === 'number'
        ? anyEl.startAngle
        : typeof anyEl.radialMeta?.startAngle === 'number'
          ? anyEl.radialMeta.startAngle
          : 0,
    radius: typeof anyEl.radius === 'number' ? anyEl.radius : 100,
    direction: anyEl.direction || 'clockwise',
    justification: anyEl.justification || 'center',
    topBase: -1,
  }

  return config
}

export function decodeRadialText(config: TextElementConfig): Partial<FabricElement> {
  const textTemplate = (config as any).textTemplate ?? ''

  const element: Partial<FabricElement> = {
    id: config.id,
    eleType: 'radialText',
    left: config.left,
    top: config.top,
    originX: config.originX,
    originY: config.originY,
    fill: config.fill,
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    textTemplate,
    localizedText: config.localizedText,
    localization: config.localization,
    textProperty: (config as any).textProperty,
    text: textTemplate,
    angle: typeof (config as any).angle === 'number' ? (config as any).angle : 0,
    radius: typeof (config as any).radius === 'number' ? (config as any).radius : 100,
    direction: (config as any).direction || 'clockwise',
    justification: (config as any).justification || 'center',
  } as any

  return element
}

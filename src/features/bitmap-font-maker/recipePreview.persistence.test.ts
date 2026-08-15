import { describe, expect, it } from 'vitest'
import { encodeText } from '@/elements/texts/text/text.encoder'
import { encodeAngledText } from '@/elements/texts/angledText/angledText.encoder'
import { encodeRadialText } from '@/elements/texts/radialText/radialText.encoder'
import { encodeScrollableText } from '@/elements/texts/scrollableText/scrollableText.encoder'
import { applyRecipePreviewToFabricObject } from './recipePreview'

const recipe = {
  schemaVersion: 1 as const,
  rendererVersion: '1' as const,
  fontWeight: 700,
  italicAngle: -12,
  outlineWidthEm: 0.04,
  outlineMode: 'outline-only' as const,
  lineJoin: 'round' as const,
  antialias: true as const
}

const previewObject = (eleType: string) => {
  const object: any = {
    id: 'persist-1',
    eleType,
    left: 10,
    top: 20,
    originX: 'center',
    originY: 'center',
    fill: '#29a3ff',
    fontFamily: 'outline-clock',
    fontSize: 50,
    fontWeight: 500,
    skewX: 3,
    stroke: '#123',
    strokeWidth: 2,
    strokeLineJoin: 'bevel',
    text: '12:48',
    textTemplate: '12:48',
    angle: -30,
    startAngle: -30,
    radius: 100,
    direction: 'clockwise',
    justification: 'center',
    scrollAreaWidth: 200,
    set(props: Record<string, unknown>) {
      Object.assign(this, props)
    }
  }
  applyRecipePreviewToFabricObject(object, recipe, object.fontSize, object.fill)
  return object
}

describe('bitmap recipe preview persistence boundary', () => {
  it.each([
    ['text', encodeText],
    ['angledText', encodeAngledText],
    ['radialText', encodeRadialText],
    ['scrollableText', encodeScrollableText]
  ] as const)('keeps %s business fill and slug without recipe display props', (eleType, encode) => {
    const encoded = encode(previewObject(eleType) as any) as any
    expect(encoded).toMatchObject({ fill: '#29a3ff', fontFamily: 'outline-clock', fontSize: 50 })
    expect(encoded).not.toHaveProperty('fontWeight')
    expect(encoded).not.toHaveProperty('skewX')
    expect(encoded).not.toHaveProperty('stroke')
    expect(encoded).not.toHaveProperty('strokeWidth')
  })
})

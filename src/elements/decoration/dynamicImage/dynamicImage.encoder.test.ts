import { describe, expect, it } from 'vitest'
import { parseExpression } from '@/engine/expression/parser'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import { decodeDynamicImage, encodeDynamicImage } from './dynamicImage.encoder'

describe('dynamic image encoder', () => {
  it('preserves shared layout and ordered items without presentation options', () => {
    const config = {
      eleType: 'dynamicImage' as const,
      id: 'weather-bg', left: 10, top: 20, originX: 'center' as const, originY: 'center' as const,
      width: 120, height: 80, rotation: 0,
      items: [{ id: 'rain', imageUrl: 'rain.png', expression: parseExpression('(w01) == 3', DEFAULT_EXPRESSION_TOKEN_CATALOG) }],
    }
    const runtime = decodeDynamicImage(config) as any
    expect(encodeDynamicImage(runtime)).toEqual(config)
  })

  it('persists one shared rotation for every dynamic image candidate', () => {
    const config = {
      eleType: 'dynamicImage' as const,
      id: 'weather-bg', left: 10, top: 20, originX: 'center' as const, originY: 'center' as const,
      width: 120, height: 80, rotation: 28,
      items: [{ id: 'rain', imageUrl: 'rain.png', expression: parseExpression('(w01) == 3', DEFAULT_EXPRESSION_TOKEN_CATALOG) }],
    }

    const runtime = decodeDynamicImage(config) as any

    expect(runtime).toMatchObject({ angle: 28, rotation: 28 })
    expect(encodeDynamicImage(runtime)).toEqual(config)
  })
})

import { describe, expect, it } from 'vitest'
import { parseExpression } from '@/engine/expression/parser'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import { resolveDynamicImageSelection } from './dynamicImage.selection'

const expression = (source: string) =>
  parseExpression(source, DEFAULT_EXPRESSION_TOKEN_CATALOG)

describe('resolveDynamicImageSelection', () => {
  it('returns the first matching item when multiple expressions are true', () => {
    const result = resolveDynamicImageSelection({
      items: [
        { id: 'rain', imageUrl: 'rain.png', expression: expression('(w01) >= 3') },
        { id: 'cloud', imageUrl: 'cloud.png', expression: expression('(w01) >= 1') },
      ],
      tokenValues: { 'weather.current.conditionCode': 3 },
    })

    expect(result).toEqual({ kind: 'item', index: 0, asset: { imageUrl: 'rain.png' } })
  })

  it('skips an item whose referenced data is unavailable', () => {
    const result = resolveDynamicImageSelection({
      items: [
        { id: 'missing', imageUrl: 'missing.png', expression: expression('(w01) == 3') },
        { id: 'fallback-rule', imageUrl: 'fallback-rule.png', expression: expression('true') },
      ],
      tokenValues: {},
    })

    expect(result).toEqual({ kind: 'item', index: 1, asset: { imageUrl: 'fallback-rule.png' } })
  })

  it('returns none when no item matches', () => {
    const result = resolveDynamicImageSelection({
      items: [
        { id: 'rain', imageUrl: 'rain.png', expression: expression('(w01) == 3') },
      ],
      tokenValues: { 'weather.current.conditionCode': 1 },
    })

    expect(result).toEqual({ kind: 'none' })
  })

  it('returns none when no item matches and no default asset exists', () => {
    const result = resolveDynamicImageSelection({
      items: [],
      tokenValues: {},
    })

    expect(result).toEqual({ kind: 'none' })
  })
})

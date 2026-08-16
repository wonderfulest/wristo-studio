import { describe, expect, it } from 'vitest'
import { parseExpression } from '@/engine/expression/parser'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import { validateDynamicImage } from './dynamicImage.validation'

const expression = parseExpression('true', DEFAULT_EXPRESSION_TOKEN_CATALOG)
describe('validateDynamicImage', () => {
  it('locates missing assets and duplicate ids by candidate index', () => {
    expect(validateDynamicImage({ eleType: 'dynamicImage', items: [
      { id: 'same', imageUrl: '', expression }, { id: 'same', imageUrl: 'ok.png', expression },
    ] } as any)).toEqual([
      'Dynamic image candidate 1 is missing an asset',
      'Dynamic image candidate 2 has a duplicate id: same',
    ])
  })
})

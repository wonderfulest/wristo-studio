import { describe, expect, it } from 'vitest'
import {
  appendOrderedOptionIds,
  moveOrderedOptionId,
  removeOrderedOptionId,
  resolveOrderedDefaultValue,
} from './orderedPropertyOptions'

describe('ordered property options', () => {
  it('appends selected ids once while preserving catalog selection order', () => {
    expect(appendOrderedOptionIds(['steps'], ['battery', 'steps', 'stress']))
      .toEqual(['steps', 'battery', 'stress'])
  })

  it('moves one id without mutating the original list', () => {
    const source = ['steps', 'battery', 'stress']

    expect(moveOrderedOptionId(source, 1, 'up')).toEqual(['battery', 'steps', 'stress'])
    expect(moveOrderedOptionId(source, 1, 'down')).toEqual(['steps', 'stress', 'battery'])
    expect(source).toEqual(['steps', 'battery', 'stress'])
  })

  it('removes one id and repairs an unavailable default to the first option value', () => {
    const ids = removeOrderedOptionId(['steps', 'battery'], 0)
    const options = [{ metricSymbol: 'battery', value: 20 }]

    expect(ids).toEqual(['battery'])
    expect(resolveOrderedDefaultValue(options, 10)).toBe(20)
  })

  it('preserves an available default and returns undefined for an empty list', () => {
    const options = [{ value: 10 }, { value: 20 }]

    expect(resolveOrderedDefaultValue(options, 20)).toBe(20)
    expect(resolveOrderedDefaultValue([], 20)).toBeUndefined()
  })
})

import { describe, expect, it } from 'vitest'
import { findInvalidUnicodePaths } from './unicodeValidation'

describe('save Unicode validation', () => {
  it('allows Chinese and complete emoji pairs', () => {
    expect(findInvalidUnicodePaths({ label: '👟 目标步数', escaped: '\ud83d\udc5f' })).toEqual([])
  })
  it('locates incomplete characters in nested settings and keys', () => {
    expect(findInvalidUnicodePaths({ properties: { goal_1: { options: [{ settingsLabel: { eng: '\ud83d Goal' } }] } } }))
      .toEqual(['$.properties.goal_1.options[0].settingsLabel.eng'])
    expect(findInvalidUnicodePaths({ label: '\udc5f', '\ud83d': 'value' })).toHaveLength(2)
  })
})

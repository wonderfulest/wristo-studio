import { describe, expect, it } from 'vitest'
import { parseExpression } from './parser'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from './tokenCatalog'
import { resolveElementVisibility } from './visibility'

const batteryLow = parseExpression('(ds3) <= 20', DEFAULT_EXPRESSION_TOKEN_CATALOG)

describe('resolveElementVisibility', () => {
  it('keeps legacy display states as the outer power-mode gate', () => {
    expect(resolveElementVisibility({
      displayStates: { active: false, ambient: true },
      previewMode: 'active',
      visibility: { mode: 'expression', expression: batteryLow, fallback: true },
      tokenValues: { 'system.battery.level': 15 },
    })).toBe(false)
  })

  it('uses the boolean expression when the display state is enabled', () => {
    const base = {
      displayStates: { active: true, ambient: true },
      previewMode: 'active' as const,
      visibility: { mode: 'expression' as const, expression: batteryLow, fallback: true },
    }

    expect(resolveElementVisibility({
      ...base,
      tokenValues: { 'system.battery.level': 15 },
    })).toBe(true)
    expect(resolveElementVisibility({
      ...base,
      tokenValues: { 'system.battery.level': 76 },
    })).toBe(false)
  })

  it('uses fallback when a referenced token is unavailable', () => {
    expect(resolveElementVisibility({
      displayStates: { active: true, ambient: true },
      previewMode: 'active',
      visibility: { mode: 'expression', expression: batteryLow, fallback: true },
      tokenValues: {},
    })).toBe(true)
  })

  it('supports literal visibility without evaluating tokens', () => {
    expect(resolveElementVisibility({
      displayStates: { active: true, ambient: true },
      previewMode: 'active',
      visibility: { mode: 'literal', value: false },
      tokenValues: {},
    })).toBe(false)
  })
})

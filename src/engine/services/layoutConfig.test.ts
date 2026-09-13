import { describe, expect, it } from 'vitest'
import { resolveLayoutVisibility, validateLayoutConfig } from './layoutConfig'
import { resolveElementVisibility } from '@/engine/expression/visibility'
import { parseExpression } from '@/engine/expression/parser'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'

const properties = { layout: { type: 'layout' as const, title: 'Layout', value: 1, options: [
  { label: 'Heart rate', value: 1 }, { label: 'Time', value: 2 },
] } }
const membership = { propertyKey: 'layout', values: [1] }

describe('global layout configuration', () => {
  it('keeps unrestricted legacy elements visible and uses the published default', () => {
    expect(resolveLayoutVisibility(undefined, {})).toBe(true)
    expect(resolveLayoutVisibility(null, properties)).toBe(true)
    expect(resolveLayoutVisibility(membership, properties)).toBe(true)
    expect(resolveLayoutVisibility(membership, properties, { layout: 2 })).toBe(false)
    expect(resolveLayoutVisibility(membership, properties, { layout: 99 })).toBe(true)
    expect(resolveLayoutVisibility({ ...membership, values: [1, 2] }, properties, { layout: 2 })).toBe(true)
  })

  it('combines layout membership with dynamic visibility and power mode', () => {
    const request = {
      displayStates: { active: true, ambient: false }, previewMode: 'active' as const,
      layoutVisibility: membership, properties, layoutValues: { layout: 1 },
      visibility: { mode: 'expression' as const, expression: parseExpression('(ds3) <= 20', DEFAULT_EXPRESSION_TOKEN_CATALOG), fallback: true },
      tokenValues: { 'system.battery.level': 10 },
    }
    expect(resolveElementVisibility(request)).toBe(true)
    expect(resolveElementVisibility({ ...request, layoutValues: { layout: 2 } })).toBe(false)
    expect(resolveElementVisibility({ ...request, tokenValues: { 'system.battery.level': 80 } })).toBe(false)
    expect(resolveElementVisibility({ ...request, previewMode: 'ambient' })).toBe(false)
    expect(resolveElementVisibility({ ...request, visibility: { mode: 'literal', value: false } })).toBe(false)
  })

  it('rejects dangling bindings, empty membership, bad defaults and duplicate values', () => {
    expect(validateLayoutConfig(properties, [{ layoutVisibility: membership }])).toEqual([])
    expect(validateLayoutConfig({}, [{ layoutVisibility: membership }])).not.toEqual([])
    expect(validateLayoutConfig(properties, [{ layoutVisibility: { ...membership, values: [] } }])).not.toEqual([])
    expect(validateLayoutConfig(properties, [{ layoutVisibility: { ...membership, values: [3] } }])).not.toEqual([])
    expect(validateLayoutConfig({ layout: { ...properties.layout, value: 3 } }, [])).not.toEqual([])
    expect(validateLayoutConfig({ layout: { ...properties.layout, options: [properties.layout.options[0], properties.layout.options[0]] } }, [])).not.toEqual([])
    expect(validateLayoutConfig({ layout: properties.layout, other: properties.layout }, [])).not.toEqual([])
  })

  it('keeps stable values independent of option order and names', () => {
    const reordered = { layout: { ...properties.layout, options: [{ label: 'Clock', value: 2 }, { label: 'Goal', value: 1 }] } }
    expect(resolveLayoutVisibility(membership, reordered, { layout: 2 })).toBe(false)
    expect(validateLayoutConfig(reordered, [{ layoutVisibility: membership }])).toEqual([])
  })
})

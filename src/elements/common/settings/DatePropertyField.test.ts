import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('DatePropertyField contract', () => {
  it('lists shared date properties and opens date property creation', () => {
    const source = readFileSync(new URL('./DatePropertyField.vue', import.meta.url), 'utf8')
    expect(source).toContain("property.type === 'date'")
    expect(source).toContain("{ type: 'date' }")
    expect(source).toContain("propName: 'dateProperty'")
  })
})

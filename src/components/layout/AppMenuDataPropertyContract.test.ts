import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('AppMenu data property creation contract', () => {
  it('stores symbol references and registers canonical definitions', () => {
    const source = readFileSync(new URL('./AppMenu.vue', import.meta.url), 'utf8')

    expect(source).toContain('metricSymbols: fieldOptions.map((option) => option.metricSymbol)')
    expect(source).toContain('defaultValue: defaultOption.metricSymbol')
    expect(source).toContain('propertiesStore.registerDataOptions(')
    expect(source).not.toContain("type: 'data', title, options: fieldOptions")
  })
})

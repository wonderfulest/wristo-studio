import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./AddElementPanel.vue', import.meta.url), 'utf8')
const appMenuSource = readFileSync(new URL('../layout/AppMenu.vue', import.meta.url), 'utf8')

describe('AddElementPanel metric property assignment', () => {
  it('assigns goal properties to subDial elements', () => {
    expect(source).toContain("['goalBar', 'goalArc', 'subDial'].includes(elementType)")
  })

  it('assigns an available goal property from the top app menu', () => {
    expect(appMenuSource).toContain("resolvedElementType === 'subDial'")
    expect(appMenuSource).toContain("getOrCreateAvailableMetricProperty('goal')")
    expect(appMenuSource).toContain('goalProperty: binding.key')
  })
})

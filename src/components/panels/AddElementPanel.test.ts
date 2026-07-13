import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./AddElementPanel.vue', import.meta.url), 'utf8')
const appMenuSource = readFileSync(new URL('../layout/AppMenu.vue', import.meta.url), 'utf8')

describe('AddElementPanel metric property assignment', () => {
  it('assigns mode-compatible Dial Properties to subDial elements', () => {
    expect(source).toContain("elementType === 'subDial'")
    expect(source).toContain('createQuickDialProperty(mode)')
  })

  it('assigns an available Dial Property from the top app menu', () => {
    expect(appMenuSource).toContain("resolvedElementType === 'subDial'")
    expect(appMenuSource).toContain('getOrCreateAvailableDialProperty(mode)')
    expect(appMenuSource).toContain('dialProperty: binding.key')
  })
})

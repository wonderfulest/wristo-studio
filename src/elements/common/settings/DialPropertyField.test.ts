import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('DialPropertyField contract', () => {
  it('filters global Dial Properties by the Sub-dial mode', () => {
    const source = readFileSync(new URL('./DialPropertyField.vue', import.meta.url), 'utf8')
    expect(source).toContain('getDialProperties(props.mode)')
    expect(source).toContain("type: 'dial'")
    expect(source).toContain('dialMode: props.mode')
  })
})

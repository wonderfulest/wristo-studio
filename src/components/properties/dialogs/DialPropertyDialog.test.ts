import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('DialPropertyDialog contract', () => {
  it('filters backend data types by immutable Dial mode', () => {
    const source = readFileSync(new URL('./DialPropertyDialog.vue', import.meta.url), 'utf8')
    expect(source).toContain('option.dialMode === formData.dialMode')
    expect(source).toContain(':disabled="isEdit"')
    expect(source).toContain('dialMin')
    expect(source).toContain("type: 'dial'")
  })
})

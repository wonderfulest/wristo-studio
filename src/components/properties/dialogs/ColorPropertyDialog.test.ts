import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('ColorPropertyDialog contract', () => {
  const source = readFileSync(new URL('./ColorPropertyDialog.vue', import.meta.url), 'utf8')

  it('uses the RGB565 fixed option helpers', () => {
    expect(source).toContain('normalizeRgb565GarminColor')
    expect(source).toContain('buildColorPropertyOptions')
    expect(source).not.toContain('ensureOptionForColorValue')
  })

  it('renders color options as read-only values', () => {
    expect(source).not.toContain('@click="addOption"')
    expect(source).not.toContain('v-model="option.label"')
    expect(source).not.toContain('v-model="option.value"')
    expect(source).not.toContain('@click="deleteOption(index)"')
    expect(source).toContain('option.label')
    expect(source).toContain('option.value')
  })
})

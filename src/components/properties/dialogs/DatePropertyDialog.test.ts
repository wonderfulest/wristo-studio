import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('DatePropertyDialog contract', () => {
  const source = readFileSync(new URL('./DatePropertyDialog.vue', import.meta.url), 'utf8')

  it('edits a stable reusable date property', () => {
    expect(source).toContain('PropertyKeyField')
    expect(source).not.toContain('LocalizedPropertyTitleField')
    expect(source).toContain("type: 'date'")
    expect(source).toContain('propertyKey')
    expect(source).toContain('defaultValue')
  })

  it('uses the shared property dialog layout', () => {
    expect(source).toContain('class="property-dialog"')
    expect(source).toContain('class="property-form"')
    expect(source).toContain('class="property-hero"')
    expect(source).toContain('class="form-section"')
    expect(source).toContain('class="message-grid"')
  })

  it('manages date options like data and color properties', () => {
    expect(source).toContain('openAddOptions')
    expect(source).toContain('confirmAddOptions')
    expect(source).toContain('deleteOption(index)')
    expect(source).toContain("moveOption(index, 'up')")
    expect(source).toContain("moveOption(index, 'down')")
    expect(source).toContain('getCommonDateFormatterValues')
    expect(source).not.toContain('<el-check-tag')
  })

  it('does not duplicate the selected default value below the selector', () => {
    expect(source).not.toContain('class="selected-option-card"')
    expect(source).not.toContain('const selectedOption = computed')
  })
})

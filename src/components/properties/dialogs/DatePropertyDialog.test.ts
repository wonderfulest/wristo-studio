import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('DatePropertyDialog contract', () => {
  const source = readFileSync(new URL('./DatePropertyDialog.vue', import.meta.url), 'utf8')

  it('edits a stable reusable date property', () => {
    expect(source).toContain('PropertyKeyField')
    expect(source).toContain('LocalizedPropertyTitleField')
    expect(source).toContain("type: 'date'")
    expect(source).toContain('propertyKey')
    expect(source).toContain('defaultValue')
  })

  it('uses three direct short, medium, and long filter tags', () => {
    expect(source).toContain('filterDateFormatOptions')
    expect(source).toContain('<el-check-tag')
    expect(source).toContain("value: 'short'")
    expect(source).toContain("value: 'medium'")
    expect(source).toContain("value: 'long'")
    expect(source).not.toContain("value: 'all'")
    expect(source).toContain("const lengthBand = ref<DateOptionLengthBand>('short')")
    expect(source).toContain('option.example')
    expect(source).toContain('exampleLength(option)')
  })

  it('keeps option editing focused on add, remove, and restore', () => {
    expect(source).not.toContain('const moveOption')
    expect(source).toContain('removeOption(index)')
    expect(source).toContain('addOption(option.value)')
    expect(source).toContain('getCommonDateFormatterValues')
  })
})

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('DialPropertyDialog contract', () => {
  it('filters backend data types by immutable Dial mode', () => {
    const source = readFileSync(new URL('./DialPropertyDialog.vue', import.meta.url), 'utf8')
    expect(source).toContain('createAddableDialOptions')
    expect(source).toContain(':disabled="isEdit"')
    expect(source).toContain('dialMin')
    expect(source).toContain("type: 'dial'")
  })

  it('matches Data Property option editing with add, delete, ordering, restore, and default selection', () => {
    const source = readFileSync(new URL('./DialPropertyDialog.vue', import.meta.url), 'utf8')

    expect(source).toContain('formData.metricSymbols')
    expect(source).toContain('addOptionsVisible')
    expect(source).toContain('multiple')
    expect(source).toContain('moveOrderedOptionId')
    expect(source).toContain('removeOrderedOptionId')
    expect(source).toContain('resolveOrderedDefaultValue')
    expect(source).toContain('restoreSystemDefaults')
    expect(source).toContain('ElMessageBox.confirm')
    expect(source).toContain('metricSymbols: [...formData.metricSymbols]')
    expect(source).toContain('options: withSimplifiedChineseOptionLabels(resolvedOptions.value)')
  })

  it('offers Direction as a third immutable Dial mode', () => {
    const source = readFileSync(new URL('./DialPropertyDialog.vue', import.meta.url), 'utf8')

    expect(source).toContain("{ label: 'Direction', value: 'direction' }")
    expect(source).toContain('dialDirectionUnit')
  })
})

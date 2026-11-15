import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('DataPropertyDialog contract', () => {
  it('shows choices inline with selection count and expandable additional options', () => {
    const source = readFileSync(new URL('./DataPropertyDialog.vue', import.meta.url), 'utf8')
    expect(source).toContain("t('asset.selectedCount', { count: formData.metricSymbols.length })")
    expect(source).toContain('<el-checkbox')
    expect(source).toContain(':aria-expanded="showMore"')
    expect(source).not.toContain('<el-select')
    expect(source).not.toContain('addOptionsVisible')
  })

  it('searches the full catalog with pinyin-aware matching', () => {
    const source = readFileSync(new URL('./DataPropertyDialog.vue', import.meta.url), 'utf8')
    expect(source).toContain('getDataTypePropertyOptions()')
    expect(source).toContain('matchesDataOptionSearch(option, optionsQuery.value)')
    expect(source).toContain('createAddableDataOptions(catalogOptions.value, [])')
  })

  it('offers inline defaults and repairs the default after deselection', () => {
    const source = readFileSync(new URL('./DataPropertyDialog.vue', import.meta.url), 'utf8')
    expect(source).toContain('<el-radio')
    expect(source).toContain('v-model="formData.value"')
    expect(source).toContain('formData.value = resolveDefaultDataOptionValue(resolvedOptions.value, formData.value)')
  })

  it('emits symbol references instead of full options', () => {
    const source = readFileSync(new URL('./DataPropertyDialog.vue', import.meta.url), 'utf8')

    expect(source).toContain('metricSymbols: [...formData.metricSymbols]')
    expect(source).not.toContain('options: formData.options')
  })

  it('registers emitted definitions at the top-level store boundary', () => {
    const panelSource = readFileSync(new URL('../PropertiesPanel.vue', import.meta.url), 'utf8')

    expect(panelSource).toContain('propertiesStore.registerDataOptions(dataOptions)')
    expect(panelSource).toContain('const { isEdit, dataOptions = [], ...propertyPayload } = propertyData')
  })
})

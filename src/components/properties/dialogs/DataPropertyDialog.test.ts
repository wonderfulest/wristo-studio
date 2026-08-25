import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('DataPropertyDialog contract', () => {
  it('shows the current data option count in the collapse title', () => {
    const source = readFileSync(new URL('./DataPropertyDialog.vue', import.meta.url), 'utf8')

    expect(source).toContain("{{ t('property.dataOptions') }}（{{ formData.metricSymbols.length }}）")
  })

  it('allows filtering the default data option without creating custom values', () => {
    const source = readFileSync(new URL('./DataPropertyDialog.vue', import.meta.url), 'utf8')
    const defaultValueSelect = source.match(
      /<el-select\s+[\s\S]*?v-model="formData\.value"[\s\S]*?<\/el-select>/
    )?.[0]

    expect(defaultValueSelect).toBeDefined()
    expect(defaultValueSelect).toContain('filterable')
    expect(defaultValueSelect).not.toContain('allow-create')
  })

  it('uses pinyin-aware filtering for both data option selectors', () => {
    const source = readFileSync(new URL('./DataPropertyDialog.vue', import.meta.url), 'utf8')

    expect(source).toContain(':filter-method="filterDefaultOptions"')
    expect(source).toContain(':filter-method="filterAddableOptions"')
    expect(source).toContain('matchesDataOptionSearch(option, defaultOptionsQuery.value)')
    expect(source).toContain('matchesDataOptionSearch(option, addableOptionsQuery.value)')
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

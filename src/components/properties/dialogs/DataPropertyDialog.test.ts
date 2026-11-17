import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { computed, reactive, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import * as helpers from './dataPropertyOptions'
import { filterDataOptionsForAppLanguage } from '@/domain/designLanguageCapabilities'

function setup(appLanguage = 'eng') {
  const catalog = ['A', 'B', 'C', 'D'].map(metricSymbol => ({ metricSymbol, value: metricSymbol, category: 'field', isActive: 1, systemDefault: 1 }))
  catalog.push({ metricSymbol: ':FIELD_TYPE_LUNAR_DATE', value: 'lunar', category: 'field', isActive: 1, systemDefault: 0 })
  const emit = vi.fn()
  const source = readFileSync(new URL('./DataPropertyDialog.vue', import.meta.url), 'utf8')
    .split('<script setup>')[1].split('</script>')[0].replace(/^import[\s\S]*?from [^\n]+\n/gm, '').replace(/^import [^\n]+\n/gm, '')
  const state = runInNewContext(`${source}\n;({ formData, formRef, initFormData, visibleOptions, optionsQuery, setDefaultOption, startOptionDrag, dropOption, toggleOption, handleConfirm, restoreSystemDefaults })`, {
    ...helpers, computed, reactive, ref, filterDataOptionsForAppLanguage,
    useDesignStore: () => ({ appLanguage }),
    useI18n: () => ({ locale: ref('en'), t: (key: string) => key }),
    getDataTypePropertyOptions: (language: any) => language ? filterDataOptionsForAppLanguage(catalog, language) : catalog,
    useDataCatalogStore: () => ({ options: catalog }),
    usePropertiesStore: () => ({ dataOptions: { ':FIELD_TYPE_LUNAR_DATE': catalog.at(-1) }, resolveDataOption: (symbol: string) => catalog.find(o => o.metricSymbol === symbol) }),
    getNextMetricPropertyDefaults: () => ({ title: 'Data', key: 'data_1' }),
    resolveMetricIconGlyph: () => '', matchesDataOptionSearch: (option: any, query: string) => option.metricSymbol.includes(query),
    ElMessageBox: { confirm: vi.fn().mockResolvedValue(undefined) }, ElMessage: { error: vi.fn() },
    defineEmits: () => emit, defineExpose: vi.fn(), showErrorOnce: vi.fn(),
  })
  return { ...state, emit }
}

describe('data option ordering', () => {
  it('puts selected items first and preserves the existing default at the front', () => {
    const state = setup()
    state.initFormData({ metricSymbols: ['C', 'A'], value: 'A' })
    expect(state.formData.metricSymbols).toEqual(['A', 'C'])
    expect(state.visibleOptions.value.map((o: any) => o.metricSymbol)).toEqual(['A', 'C', 'B', 'D'])
    state.startOptionDrag({}, 'C')
    state.dropOption({ preventDefault: vi.fn() }, 'A')
    expect(state.formData.value).toBe('C')
    state.toggleOption('C', false)
    expect(state.formData.value).toBe('A')
    state.toggleOption('B', true)
    expect(state.formData.metricSymbols).toEqual(['A', 'B'])
  })

  it('sets a search result as default, selects it once and persists its order', async () => {
    const state = setup()
    state.initFormData({ metricSymbols: ['A', 'C'], value: 'A' })
    state.optionsQuery.value = 'B'
    expect(state.visibleOptions.value.map((o: any) => o.metricSymbol)).toEqual(['B'])
    state.setDefaultOption('B')
    state.setDefaultOption('B')
    expect(state.formData.metricSymbols).toEqual(['B', 'A', 'C'])
    expect(state.formData.value).toBe('B')
    expect(state.optionsQuery.value).toBe('B')
    state.formRef.value = { validate: vi.fn().mockResolvedValue(true) }
    await state.handleConfirm()
    expect(state.emit).toHaveBeenCalledWith('confirm', expect.objectContaining({
      metricSymbols: ['B', 'A', 'C'], defaultValue: 'B',
    }))
    state.setDefaultOption('C')
    expect(state.formData.metricSymbols).toEqual(['C', 'B', 'A'])
    state.toggleOption('C', false)
    expect(state.formData.value).toBe('B')
  })

  it('restores missing system options without resetting the chosen order or default', async () => {
    const state = setup('zhs')
    state.initFormData({ metricSymbols: ['C', ':FIELD_TYPE_LUNAR_DATE', 'A'], value: 'C' })
    await state.restoreSystemDefaults()
    expect(state.formData.metricSymbols).toEqual(['C', 'A', 'B', 'D'])
    expect(state.formData.value).toBe('C')
    await state.restoreSystemDefaults()
    expect(state.formData.metricSymbols).toEqual(['C', 'A', 'B', 'D'])
    state.formRef.value = { validate: vi.fn().mockResolvedValue(true) }
    await state.handleConfirm()
    expect(state.emit).toHaveBeenCalledWith('confirm', expect.objectContaining({
      metricSymbols: ['C', 'A', 'B', 'D'], defaultValue: 'C',
    }))
  })

  it('emits the displayed order and first item as the generated project default', async () => {
    const state = setup()
    state.initFormData({ metricSymbols: ['C', 'A', 'B'], value: 'C' })
    state.startOptionDrag({}, 'A')
    state.dropOption({ preventDefault: vi.fn() }, 'C')
    state.formRef.value = { validate: vi.fn().mockResolvedValue(true) }
    await state.handleConfirm()
    expect(state.emit).toHaveBeenCalledWith('confirm', expect.objectContaining({
      metricSymbols: ['A', 'C', 'B'], defaultValue: 'A',
    }))
    expect(state.emit.mock.calls[0][1].dataOptions.map((o: any) => o.metricSymbol)).toEqual(['A', 'C', 'B'])
    await state.restoreSystemDefaults()
    expect(state.formData.metricSymbols).toEqual(['A', 'C', 'B', 'D'])
    expect(state.formData.value).toBe('A')
  })
})

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
    expect(source).toContain('getDataTypePropertyOptions(designStore.appLanguage)')
    expect(source).toContain('matchesDataOptionSearch(option, optionsQuery.value)')
    expect(source).toContain('createAddableDataOptions(catalogOptions.value, [])')
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

describe('watchface language filtering', () => {
  it('hides Chinese date fields for English watchfaces even when selected in an old design', () => {
    const state = setup('eng')
    state.initFormData({ metricSymbols: ['A', ':FIELD_TYPE_LUNAR_DATE'], value: 'A' })
    expect(state.visibleOptions.value.map((o: any) => o.metricSymbol)).not.toContain(':FIELD_TYPE_LUNAR_DATE')
  })
  it('keeps Chinese date fields for Chinese watchfaces', () => {
    const state = setup('zhs')
    state.initFormData({ metricSymbols: ['A', ':FIELD_TYPE_LUNAR_DATE'], value: 'A' })
    expect(state.visibleOptions.value.map((o: any) => o.metricSymbol)).toContain(':FIELD_TYPE_LUNAR_DATE')
  })
})

import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import { computed, reactive, ref } from 'vue'
import { resolveOrderedDefaultValue } from './orderedPropertyOptions'

function setup() {
  const catalog = [
    { value: 101, metricSymbol: ':GOAL_TYPE_STEPS', category: 'goal' },
    { value: 102, metricSymbol: ':GOAL_TYPE_CALORIES', category: 'goal' },
    { value: 1, metricSymbol: ':FIELD_TYPE_STEPS', category: 'data' },
  ]
  const confirm = vi.fn().mockResolvedValue(undefined)
  const source = readFileSync(new URL('./GoalPropertyDialog.vue', import.meta.url), 'utf8')
    .split('<script setup>')[1].split('</script>')[0].replace(/^import .*$/gm, '')
  const state = runInNewContext(`${source}\n;({ formData, initFormData, addableOptions, pendingOptionValues, confirmAddOptions, restoreSystemDefaults, deleteOption })`, {
    computed, reactive, ref, resolveOrderedDefaultValue,
    useI18n: () => ({ locale: ref('en'), t: (key: string) => key }),
    getDataTypePropertyOptions: () => catalog,
    withSimplifiedChineseOptionLabels: (options: unknown) => options,
    getNextMetricPropertyDefaults: () => ({ title: 'Goal', key: 'goal_1' }),
    ElMessageBox: { confirm }, defineEmits: () => vi.fn(), defineExpose: vi.fn(),
  })
  return { ...state, confirm }
}

describe('goal option editing', () => {
  it('preserves saved subsets and adds only missing goal options with numeric values', () => {
    const state = setup()
    state.initFormData({ options: [{ value: 102 }], value: 102 })
    expect(state.formData.options.map((o: any) => o.value)).toEqual([102])
    expect(state.addableOptions.value.map((o: any) => o.value)).toEqual([101])
    state.pendingOptionValues.value = [101, 102, 1]
    state.confirmAddOptions()
    expect(state.formData.options.map((o: any) => o.value)).toEqual([102, 101])
    expect(state.formData.value).toBe(102)
    state.deleteOption(0)
    expect(state.formData.value).toBe(101)
  })

  it('restores system order, preserves valid defaults, and leaves canceled edits intact', async () => {
    const state = setup()
    state.initFormData({ options: [{ value: 102 }], value: 102 })
    state.confirm.mockRejectedValueOnce('cancel')
    await state.restoreSystemDefaults()
    expect(state.formData.options.map((o: any) => o.value)).toEqual([102])
    await state.restoreSystemDefaults()
    expect(state.formData.options.map((o: any) => o.value)).toEqual([101, 102])
    expect(state.formData.value).toBe(102)
    state.deleteOption(0)
    state.deleteOption(0)
    state.pendingOptionValues.value = [101]
    state.confirmAddOptions()
    expect(state.formData.value).toBe(101)
  })
})

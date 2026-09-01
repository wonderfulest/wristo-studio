// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia'
import { shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseExpression } from '@/engine/expression/parser'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import { addElement, removeElement } from '@/engine/managers/elementManager'
import DynamicImagePanel from './dynamicImage.panel.vue'

const managerMocks = vi.hoisted(() => ({ addElement: vi.fn(), removeElement: vi.fn() }))
const historyMocks = vi.hoisted(() => ({ runWithoutRecording: vi.fn(), saveState: vi.fn() }))
vi.mock('@/engine/managers/elementManager', () => managerMocks)
vi.mock('@/stores/historyStore', () => ({ useHistoryStore: () => historyMocks }))

describe('dynamic image panel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    managerMocks.addElement.mockReset().mockResolvedValue({})
    managerMocks.removeElement.mockReset()
    historyMocks.runWithoutRecording.mockReset().mockImplementation(async (task) => task())
    historyMocks.saveState.mockReset()
  })

  it('deletes a rule directly from its list row', async () => {
    const applyPatch = vi.fn()
    const items = [
      {
        id: 'day',
        imageUrl: 'https://cdn.example/day.png',
        expression: parseExpression('(as2.2) == 1', DEFAULT_EXPRESSION_TOKEN_CATALOG),
      },
      {
        id: 'night',
        imageUrl: 'https://cdn.example/night.png',
        expression: parseExpression('(as2.2) == 0', DEFAULT_EXPRESSION_TOKEN_CATALOG),
      },
    ]
    const wrapper = shallowMount(DynamicImagePanel, {
      props: { config: { width: 100, height: 50, items }, applyPatch },
      global: {
        stubs: {
          'el-form': true,
          'el-form-item': true,
          'el-input-number': true,
          'el-button': { template: '<button><slot /></button>' },
          'el-dialog': true,
          AssetPicker: true,
          ExpressionEditor: true,
          TokenPreviewControls: true,
          DynamicImageGroupCopyDialog: true,
        },
      },
    })

    const firstRow = wrapper.findAll('.dynamic-image-row')[0]
    const deleteButton = firstRow.findAll('button').find((button) => button.text() === 'Delete')

    expect(deleteButton).toBeDefined()
    await deleteButton!.trigger('click')
    expect(applyPatch).toHaveBeenCalledWith({ items: [items[1]] })
  })

  it('patches one shared rotation for the dynamic image frame', async () => {
    const applyPatch = vi.fn()
    const wrapper = shallowMount(DynamicImagePanel, {
      props: { config: { width: 100, height: 50, rotation: 0, items: [] }, applyPatch },
      global: {
        stubs: {
          'el-form': { template: '<form><slot /></form>' },
          'el-form-item': { template: '<label><slot /></label>' },
          'el-input-number': { name: 'ElInputNumber', props: ['modelValue'], emits: ['change'], template: '<input />' },
          'el-button': true,
          'el-dialog': true,
          AssetPicker: true,
          ExpressionEditor: true,
          TokenPreviewControls: true,
          DynamicImageGroupCopyDialog: true,
        },
      },
    })

    wrapper.findComponent({ name: 'ElInputNumber' }).vm.$emit('change', 72)
    await wrapper.vm.$nextTick()

    expect(applyPatch).toHaveBeenCalledWith({ rotation: 72 })
  })

  it('applies the first quick-import group and creates additional groups as sibling elements', async () => {
    const applyPatch = vi.fn()
    const wrapper = shallowMount(DynamicImagePanel, {
      props: {
        config: { id: 'current', left: 80, top: 90, width: 100, height: 50, rotation: 0, items: [] },
        applyPatch,
      },
      global: {
        stubs: {
          'el-form': true,
          'el-form-item': true,
          'el-input-number': true,
          'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          'el-dialog': true,
          AssetPicker: true,
          ExpressionEditor: true,
          TokenPreviewControls: true,
          DynamicImageGroupCopyDialog: true,
          DynamicImageQuickImportDialog: { name: 'DynamicImageQuickImportDialog', props: ['applyGroups'], template: '<div />' },
        },
      },
    })
    const minuteItems = [{ id: 'minute-0', imageUrl: 'minute.png', expression: parseExpression('(tm8) == 0', DEFAULT_EXPRESSION_TOKEN_CATALOG) }]
    const weatherItems = [{ id: 'weather-0', imageUrl: 'weather.png', expression: parseExpression('(w01) == 0', DEFAULT_EXPRESSION_TOKEN_CATALOG) }]

    await wrapper.findComponent({ name: 'DynamicImageQuickImportDialog' }).props('applyGroups')([
      { kind: 'minute', width: 120, height: 80, items: minuteItems },
      { kind: 'weather', width: 64, height: 64, items: weatherItems },
    ])
    await wrapper.vm.$nextTick()

    expect(applyPatch).toHaveBeenCalledWith({ width: 120, height: 80, items: minuteItems })
    expect(addElement).toHaveBeenCalledWith('dynamicImage', expect.objectContaining({
      eleType: 'dynamicImage', left: 92, top: 102, width: 64, height: 64, items: weatherItems,
    }))
    expect(historyMocks.runWithoutRecording).toHaveBeenCalledTimes(1)
    expect(historyMocks.saveState).toHaveBeenCalledTimes(1)
  })

  it('rolls back the current group and created siblings when sibling creation fails', async () => {
    const originalItems = [{ id: 'original', imageUrl: 'original.png', expression: parseExpression('true', DEFAULT_EXPRESSION_TOKEN_CATALOG) }]
    const applyPatch = vi.fn().mockResolvedValue(undefined)
    const createdSibling = { id: 'created' }
    managerMocks.addElement.mockResolvedValueOnce(createdSibling).mockRejectedValueOnce(new Error('create failed'))
    const wrapper = shallowMount(DynamicImagePanel, {
      props: { config: { id: 'current', left: 80, top: 90, width: 100, height: 50, rotation: 0, items: originalItems }, applyPatch },
      global: { stubs: {
        'el-form': true, 'el-form-item': true, 'el-input-number': true,
        'el-button': true, 'el-dialog': true, AssetPicker: true, ExpressionEditor: true,
        TokenPreviewControls: true, DynamicImageGroupCopyDialog: true,
        DynamicImageQuickImportDialog: { name: 'DynamicImageQuickImportDialog', template: '<div />' },
      } },
    })
    const importedItem = { id: 'imported', imageUrl: 'imported.png', expression: parseExpression('(tm8) == 0', DEFAULT_EXPRESSION_TOKEN_CATALOG) }

    await expect((wrapper.vm as any).handleQuickImported([
      { kind: 'minute', width: 120, height: 80, items: [importedItem] },
      { kind: 'weekday', width: 60, height: 60, items: [importedItem] },
      { kind: 'weather', width: 64, height: 64, items: [importedItem] },
    ])).rejects.toThrow('create failed')

    expect(removeElement).toHaveBeenCalledWith(createdSibling)
    expect(applyPatch).toHaveBeenLastCalledWith({ width: 100, height: 50, items: originalItems })
    expect(historyMocks.saveState).not.toHaveBeenCalled()
  })
})

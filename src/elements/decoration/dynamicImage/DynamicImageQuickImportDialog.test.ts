// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia'
import { shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import DynamicImageQuickImportDialog from './DynamicImageQuickImportDialog.vue'
import type { DynamicImageImportPlan } from './dynamicImage.quickImport'

const upload = vi.hoisted(() => vi.fn())
vi.mock('@/api/wristo/analogAsset', () => ({ analogAssetApi: { upload } }))

describe('dynamic image quick import dialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    upload.mockReset().mockResolvedValue({ data: { id: 9, file: { url: 'https://cdn.example/minute-00.png' } } })
  })

  it('offers a multi-image picker without accepting ZIP archives', () => {
    const wrapper = shallowMount(DynamicImageQuickImportDialog, {
      props: { modelValue: true, applyGroups: vi.fn() },
      global: { stubs: {
        'el-dialog': { template: '<section><slot /><slot name="footer" /></section>' },
        'el-button': { template: '<button><slot /></button>' },
        'el-alert': true,
        'el-progress': true,
      } },
    })

    const fileInputs = wrapper.findAll('input[type="file"]')
    expect(fileInputs[0].attributes('multiple')).toBeDefined()
    expect(fileInputs[0].attributes('accept')).toBe('.png,.svg')
    expect(fileInputs[1].attributes('multiple')).toBeDefined()
    expect(fileInputs[1].attributes('webkitdirectory')).toBeDefined()
    expect(fileInputs[1].attributes('accept')).toBe('.png,.svg')
    expect(wrapper.text()).toContain('Select images')
    expect(wrapper.text()).not.toContain('ZIP')
  })

  it('keeps the dialog open until the parent applies every imported group', async () => {
    let finishApply: (() => void) | undefined
    const applyGroups = vi.fn(() => new Promise<void>((resolve) => { finishApply = resolve }))
    const wrapper = shallowMount(DynamicImageQuickImportDialog, {
      props: { modelValue: true, applyGroups },
      global: { stubs: {
        'el-dialog': { template: '<section><slot /><slot name="footer" /></section>' },
        'el-button': { template: '<button :disabled="$attrs.disabled" @click="$emit(\'click\')"><slot /></button>' },
        'el-alert': true,
        'el-progress': true,
      } },
    })
    const source = {
      name: 'minute-00.png',
      file: new File(['image'], 'minute-00.png', { type: 'image/png' }),
      width: 120,
      height: 80,
    }
    ;(wrapper.vm as any).plan = {
      errors: [], warnings: [],
      groups: [{ kind: 'minute', tokenCode: 'tm8', width: 120, height: 80, entries: [{ kind: 'minute', value: 0, isDefault: false, source, expression: '(tm8) == 0' }] }],
    } satisfies DynamicImageImportPlan
    await wrapper.vm.$nextTick()

    const confirm = wrapper.findAll('button').find((button) => button.text() === 'Upload and create groups')
    await confirm!.trigger('click')
    await flushPromises()

    expect(applyGroups).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    finishApply?.()
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
  })
})

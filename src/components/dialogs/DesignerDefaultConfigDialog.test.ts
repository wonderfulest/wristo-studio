// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  getByUserId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/api/wristo/designerDefaultConfig', () => ({
  designerDefaultConfigApi: apiMocks,
}))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ userInfo: { id: 7 } }),
}))
vi.mock('@/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

import DesignerDefaultConfigDialog from './DesignerDefaultConfigDialog.vue'

const stubs = {
  ElDialog: { template: '<section><slot /><slot name="footer" /></section>' },
  ElForm: { template: '<form><slot /></form>' },
  ElFormItem: { template: '<div><slot /></div>' },
  ElSelect: { template: '<div><slot /></div>' },
  ElOption: true,
  ElInputNumber: true,
  ElSwitch: true,
  ElTabs: { template: '<div class="tabs"><slot /></div>' },
  ElTabPane: {
    props: ['label', 'name'],
    template: '<section class="tab-pane" :data-name="name" :data-label="label"><slot /></section>',
  },
  ElButton: {
    emits: ['click'],
    template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>',
  },
  TemplateTextEditor: {
    props: ['modelValue'],
    template: '<div class="template-editor-stub">{{ modelValue }}</div>',
  },
}

describe('DesignerDefaultConfigDialog localized templates', () => {
  it('loads English and Chinese templates into separate tabs and saves both', async () => {
    apiMocks.getByUserId.mockResolvedValue({
      data: {
        id: 10,
        userId: 7,
        defaultPaymentMethod: 'wpay',
        defaultPrice: 2.39,
        defaultCurrency: 'USD',
        descriptionTemplate: 'English template',
        descriptionTemplateZh: '中文模板',
        enableAutoPublish: 1,
        isActive: 1,
      },
    })
    apiMocks.update.mockResolvedValue({ data: { id: 10 } })

    const wrapper = mount(DesignerDefaultConfigDialog, { global: { stubs } })
    await (wrapper.vm as unknown as { show: () => Promise<void> }).show()
    await flushPromises()

    const panes = wrapper.findAll('.tab-pane')
    expect(panes.map((pane) => pane.attributes('data-name'))).toEqual(['en', 'zh'])
    expect(wrapper.findAll('.template-editor-stub').map((editor) => editor.text())).toEqual([
      'English template',
      '中文模板',
    ])

    await wrapper.findAll('button.el-button').at(-1)!.trigger('click')
    await flushPromises()

    expect(apiMocks.update).toHaveBeenCalledWith(expect.objectContaining({
      descriptionTemplate: 'English template',
      descriptionTemplateZh: '中文模板',
    }))
  })
})

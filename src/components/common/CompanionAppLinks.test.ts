// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CompanionAppLinks from './CompanionAppLinks.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(), success: vi.fn(), error: vi.fn(), write: vi.fn() }))
vi.mock('@/api/wristo/companionApps', () => ({ getCompanionApps: mocks.get }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('element-plus', () => ({ ElMessage: { success: mocks.success, error: mocks.error } }))
const mountLinks = () => mount(CompanionAppLinks, {
  props: { visible: true },
  global: { stubs: {
    ElFormItem: { template: '<div><slot /></div>' },
    ElInput: defineComponent({ props: ['modelValue', 'readonly', 'placeholder'], template: '<div><input :value="modelValue" :readonly="readonly" :placeholder="placeholder" /><slot name="append" /></div>' }),
    ElButton: defineComponent({ props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' }),
  } },
})
const config = { ios: 'https://apps.apple.com/app/id123', android: '', iosAlternatives: [], androidAlternatives: ['https://wristo.io/download'] }
beforeEach(() => {
  vi.clearAllMocks()
  mocks.get.mockResolvedValue(config)
  mocks.write.mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: mocks.write } })
})
describe('companion app publishing links', () => {
  it('renders readonly fields, disables missing URLs and copies the exact alternative URL', async () => {
    const wrapper = mountLinks()
    await flushPromises()
    expect(wrapper.findAll('input').every(input => input.element.readOnly)).toBe(true)
    expect(wrapper.findAll('button')[1].element.disabled).toBe(true)
    await wrapper.findAll('button')[2].trigger('click')
    expect(mocks.write).toHaveBeenCalledWith(config.androidAlternatives[0])
  })
  it('reports failure, retries and refreshes when reopened', async () => {
    mocks.get.mockRejectedValueOnce(new Error('offline'))
    const wrapper = mountLinks()
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('input')).toHaveLength(3)
    await wrapper.setProps({ visible: false })
    await wrapper.setProps({ visible: true })
    await flushPromises()
    expect(mocks.get).toHaveBeenCalledTimes(3)
  })
  it('reports clipboard failure without changing the displayed address', async () => {
    mocks.write.mockRejectedValueOnce(new Error('denied'))
    const wrapper = mountLinks()
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(mocks.error).toHaveBeenCalledWith('common.copyFailed')
    expect(wrapper.find('input').element.value).toBe(config.ios)
  })
})

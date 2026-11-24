// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ start: vi.fn(), list: vi.fn(), status: vi.fn(), file: vi.fn(), capabilities: vi.fn(), prices: vi.fn(), balance: vi.fn(), user: null as any }))
vi.mock('@/api/wristo/aiWatchface', () => ({ aiWatchfaceApi: mocks, isWatchfacePending: (j: any) => !!j && ['queued', 'running', 'refund_pending'].includes(j.status) }))
vi.mock('@/api/wristo/studioAi', () => ({ getAiCapabilities: mocks.capabilities, getAiPrices: mocks.prices }))
vi.mock('@/api/wristo/studioCredits', () => ({ studioCreditsApi: mocks }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.user }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ locale: { value: 'zh' } }) }))
import CreateProjectDialog from './CreateProjectDialog.vue'
const wrappers: any[] = []
function setup() {
  const importFile = vi.fn().mockResolvedValue(true)
  const wrapper = mount(CreateProjectDialog, { props: { width: 454, height: 454, canvasVersion: () => 3, importFile }, global: { stubs: {
    ElDialog: { name: 'ElDialog', props: ['modelValue'], template: '<section v-if="modelValue" role="dialog"><slot name="header"/><slot/><slot name="footer"/></section>' },
    ElInput: { name: 'ElInput', props: ['modelValue', 'disabled', 'type'], emits: ['update:modelValue'], template: '<textarea v-if="type === \'textarea\'" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)"/><input v-else :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)"/>' },
    ElSwitch: { name: 'ElSwitch', props: ['modelValue', 'disabled'], emits: ['update:modelValue'], template: '<button role="switch" :aria-checked="modelValue" :disabled="disabled" @click="$emit(\'update:modelValue\', !modelValue)"/>' },
    ElRadioGroup: { name: 'ElRadioGroup', props: ['modelValue'], template: '<div role="group" :data-value="modelValue"><slot/></div>' },
    ElRadioButton: { template: '<button><slot/></button>' },
    ElButton: { props: ['disabled', 'loading'], template: '<button :disabled="disabled || loading"><slot/></button>' },
  } } })
  wrappers.push(wrapper)
  const choice = wrapper.vm.show()
  return { wrapper, choice, importFile, button: (text: string) => wrapper.findAll('button').find(b => b.text() === text)! }
}
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers()
  mocks.user = reactive({ userInfo: { id: 7 } })
  mocks.capabilities.mockResolvedValue({ data: { WATCHFACE: true } }); mocks.prices.mockResolvedValue({ data: { WATCHFACE: 20 } }); mocks.balance.mockResolvedValue({ data: { balance: 50 } }); mocks.list.mockResolvedValue({ data: [] })
  mocks.start.mockResolvedValue({ data: { id: 'job', status: 'running' } })
  mocks.status.mockResolvedValue({ data: { id: 'job', status: 'succeeded' } })
  mocks.file.mockResolvedValue(new File(['wrt'], 'result.wrt'))
})
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.useRealTimers() })
it('defaults to English and hides AI fields without fetching AI services', async () => {
  const s = setup(); await flushPromises()
  expect(s.wrapper.get('[role="group"]').attributes('data-value')).toBe('eng')
  expect(s.wrapper.find('textarea').exists()).toBe(false)
  expect(mocks.capabilities).not.toHaveBeenCalled()
  await s.button('取消').trigger('click')
  expect(await s.choice).toBeNull()
})
it('submits the selected name, language and independent sharing switches once', async () => {
  const s = setup(); await flushPromises()
  await s.wrapper.get('#new-project-name').setValue('  Orbit  ')
  s.wrapper.findComponent({ name: 'ElRadioGroup' }).vm.$emit('update:modelValue', 'zhs')
  await s.wrapper.get('[aria-label="对外公开"]').trigger('click')
  await s.wrapper.get('[aria-label="允许他人复制"]').trigger('click')
  await s.button('创建项目').trigger('click')
  expect(await s.choice).toEqual({ name: 'Orbit', appLanguage: 'zhs', publiclyVisible: false, allowRemix: true, useAi: false })
  expect(s.button('创建项目').attributes('disabled')).toBeDefined()
  await s.wrapper.vm.initialized(); await flushPromises()
  expect(s.wrapper.find('[role="dialog"]').exists()).toBe(false)
})
it('keeps AI inputs and generation in the same dialog and starts only after project initialization', async () => {
  const s = setup(); await flushPromises()
  await s.wrapper.get('[aria-label="使用 AI 生成"]').trigger('click'); await flushPromises()
  expect(s.wrapper.findAll('[role="dialog"]')).toHaveLength(1)
  expect(s.wrapper.text()).toContain('本次使用 20 AI 点数')
  expect(s.button('创建并生成').attributes('disabled')).toBeDefined()
  await s.wrapper.get('textarea').setValue('Minimal orange dial')
  await s.button('创建并生成').trigger('click'); await s.choice
  expect(mocks.start).not.toHaveBeenCalled()
  await s.wrapper.vm.initialized(); await flushPromises()
  expect(mocks.start).toHaveBeenCalledOnce()
  expect(mocks.start).toHaveBeenCalledWith(expect.any(String), 'Minimal orange dial', 454, 454, 20, undefined)
  await vi.advanceTimersByTimeAsync(2000); await flushPromises()
  expect(s.importFile).toHaveBeenCalledWith(expect.any(File), true, 'new-project', 3)
  expect(s.wrapper.find('[role="dialog"]').exists()).toBe(false)
})
it('hides the description and reference input again when AI is disabled', async () => {
  const s = setup(); await flushPromises()
  await s.wrapper.get('[aria-label="使用 AI 生成"]').trigger('click'); await flushPromises()
  expect(s.wrapper.find('input[type="file"]').exists()).toBe(true)
  await s.wrapper.get('[aria-label="使用 AI 生成"]').trigger('click')
  expect(s.wrapper.find('textarea').exists()).toBe(false)
  expect(s.wrapper.find('input[type="file"]').exists()).toBe(false)
  expect(mocks.start).not.toHaveBeenCalled()
})
it('prevents AI submission with insufficient points but allows blank creation', async () => {
  mocks.balance.mockResolvedValue({ data: { balance: 1 } })
  const s = setup(); await flushPromises()
  await s.wrapper.get('[aria-label="使用 AI 生成"]').trigger('click'); await flushPromises()
  await s.wrapper.get('textarea').setValue('Dial')
  expect(s.button('创建并生成').attributes('disabled')).toBeDefined()
  await s.wrapper.get('[aria-label="使用 AI 生成"]').trigger('click')
  expect(s.button('创建项目').attributes('disabled')).toBeUndefined()
})

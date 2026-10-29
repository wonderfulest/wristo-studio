// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ prepare: vi.fn() }))
vi.mock('./batchDesignActions', () => ({ batchActions: ['transfer', 'delete', 'submit'], prepareBatchAction: mocks.prepare }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/users/DesignerSelect.vue', () => ({ default: { template: '<div />' } }))
vi.mock('./BatchSubmitConfig.vue', () => ({ default: { name: 'BatchSubmitConfigForm', emits: ['update', 'ready'], template: '<div />' } }))
import BatchDesignActions from './BatchDesignActions.vue'
let wrapper: ReturnType<typeof mount>
afterEach(() => { wrapper?.unmount(); vi.resetAllMocks() })
function setup(admin = true) {
 wrapper = mount(BatchDesignActions, { props: { designs: [1, 2].map(id => ({ id, name: `Face ${id}`, designUid: `d${id}` })) as any, modelValue: [1, 2], isAdmin: admin, loading: false, contextKey: 'one', deviceId: 'venu3' }, global: { stubs: { ElDialog: { template: '<div><slot /><slot name="footer" /></div>' }, ElButton: { template: '<button><slot /></button>' }, ElSelect: true, ElOption: true, ElCheckbox: true, ElSwitch: true, ElInputNumber: true } } })
 return wrapper.vm as any
}
describe('batch action workflow', () => {
 it('hides controls and refuses preparation and execution without admin access', async () => {
  const vm = setup(false); vm.open(); await vm.preview(); await vm.execute()
  expect(wrapper.find('.batch-actions').exists()).toBe(false)
  expect(mocks.prepare).not.toHaveBeenCalled()
 })
 it('requires review before deletion and retains only failed items for retry', async () => {
  const run = vi.fn().mockResolvedValueOnce(true).mockRejectedValueOnce(new Error('Rejected'))
  mocks.prepare.mockImplementation(async (design: any) => ({ design, run }))
  const vm = setup(); vm.action = 'delete'; vm.open()
  await vm.execute(); expect(run).not.toHaveBeenCalled()
  await vm.preview(); expect(run).not.toHaveBeenCalled()
  expect(vm.phase).toBe('review')
  await vm.execute(); await flushPromises()
  expect(vm.results.map((r: any) => r.status)).toEqual(['success', 'failed'])
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[2]])
  expect(wrapper.text()).toContain('Rejected')
  vm.retry(); expect(vm.batch.map((d: any) => d.id)).toEqual([2])
  expect(vm.phase).toBe('configure')
 })
 it('does not execute skipped items or duplicate a pending execution', async () => {
  let resolve!: () => void
  const run = vi.fn(() => new Promise<void>(r => { resolve = r }))
  mocks.prepare.mockImplementation(async (design: any) => design.id === 1 ? { design, run } : { design, reason: 'Unavailable' })
  const vm = setup(); vm.action = 'delete'; vm.open(); await vm.preview()
  const pending = vm.execute(); await vm.execute()
  expect(run).toHaveBeenCalledTimes(1)
  resolve(); await pending
  expect(vm.results.map((r: any) => r.status)).toEqual(['success', 'skipped'])
 })
})

it('waits for shared settings and passes only the selected overrides to every preparation', async () => {
 const run = vi.fn().mockResolvedValue(true)
 mocks.prepare.mockImplementation(async (design: any) => ({ design, run }))
 const vm = setup(); vm.action = 'submit'; vm.open()
 await flushPromises()
 await vm.preview()
 expect(mocks.prepare).not.toHaveBeenCalled()
 const form = wrapper.findComponent({ name: 'BatchSubmitConfigForm' })
 form.vm.$emit('update', { paymentMethod: 'wpay', price: 2.39, trialLasts: 0.25 })
 form.vm.$emit('ready', true)
 await vm.preview()
 expect(mocks.prepare).toHaveBeenCalledTimes(2)
 for (const call of mocks.prepare.mock.calls) expect(call[2].submitConfig).toEqual({ paymentMethod: 'wpay', price: 2.39, trialLasts: 0.25 })
 expect(run).not.toHaveBeenCalled()
 await vm.execute()
 expect(run).toHaveBeenCalledTimes(2)
})

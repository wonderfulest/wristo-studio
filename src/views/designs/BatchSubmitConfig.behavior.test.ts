// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({ getDesignByUid: vi.fn(), getPackagingDevices: vi.fn() }))
vi.mock('@/api/wristo/design', () => ({ designApi: api }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
import BatchSubmitConfig from './BatchSubmitConfig.vue'
let wrapper: ReturnType<typeof mount>
beforeEach(() => {
 vi.resetAllMocks()
 api.getDesignByUid.mockImplementation(async (designUid: string) => ({ code: 0, data: { designUid, product: { payment: { paymentMethod: 'wpay', price: designUid === 'a' ? 2.39 : 3.99 }, trialLasts: 0.25 } } }))
 api.getPackagingDevices.mockResolvedValue({ code: 0, data: { devices: [{ deviceId: 'venu3', displayName: 'Venu 3' }], selectedDeviceIds: ['venu3'] } })
})
afterEach(() => wrapper?.unmount())
function setup(onReady = vi.fn()) {
 wrapper = mount(BatchSubmitConfig, { props: { designs: [{ designUid: 'a' }, { designUid: 'b' }] as any, deviceId: '', disabled: false, onReady }, global: {
  directives: { loading: () => {} },
  stubs: { ElForm: { template: '<form><slot /></form>' }, ElFormItem: { props: ['label'], template: '<label>{{ label }}<slot /></label>' }, ElSelect: { name: 'ElSelect', props: ['modelValue'], template: '<div />' }, ElOption: true, ElInputNumber: { name: 'ElInputNumber', props: ['modelValue'], template: '<input />' }, ElButton: { template: '<button><slot /></button>' }, ElAlert: { props: ['title'], template: '<p role="alert">{{ title }}</p>' } },
 } })
 return wrapper.vm as any
}
it('loads common values without applying them, and emits only edited fields', async () => {
 setup(); await flushPromises()
 expect(wrapper.emitted('ready')).toEqual([[false], [true]])
 expect(wrapper.emitted('update')?.at(-1)).toEqual([{}])
 expect(wrapper.text()).toContain('batchActions.mixed')
 const inputs = wrapper.findAllComponents({ name: 'ElInputNumber' })
 inputs[0].vm.$emit('update:modelValue', 4.99)
 await flushPromises()
 expect(wrapper.emitted('update')?.at(-1)).toEqual([{ price: 4.99 }])
 expect(wrapper.text()).toContain('batchActions.applyAll')
 await wrapper.findAll('button').at(-1)!.trigger('click')
 expect(wrapper.emitted('update')?.at(-1)).toEqual([{}])
})
it('select-all edits devices once and clearing is an explicit empty selection', async () => {
 setup(); await flushPromises()
 await wrapper.find('button').trigger('click')
 expect(wrapper.emitted('update')?.at(-1)).toEqual([{ targetDeviceIds: ['venu3'] }])
 wrapper.findAllComponents({ name: 'ElSelect' }).at(-1)!.vm.$emit('update:modelValue', [])
 expect(wrapper.emitted('update')?.at(-1)).toEqual([{ targetDeviceIds: [] }])
})
it('blocks readiness on loading failure and can retry', async () => {
 api.getDesignByUid.mockRejectedValueOnce(new Error('Details unavailable'))
 setup(); await flushPromises()
 expect(wrapper.emitted('ready')).toEqual([[false]])
 expect(wrapper.find('[role="alert"]').text()).toBe('Details unavailable')
 await wrapper.find('button').trigger('click'); await flushPromises()
 expect(wrapper.emitted('ready')?.at(-1)).toEqual([true])
})
it('ignores a response after the form is unmounted', async () => {
 let resolve!: (value: any) => void
 const pending = new Promise(r => { resolve = r })
 api.getDesignByUid.mockImplementation(() => pending)
 const onReady = vi.fn()
 setup(onReady); wrapper.unmount()
 resolve({ code: 0, data: { product: {} } }); await flushPromises()
 expect(onReady.mock.calls).toEqual([[false]])
})

// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ cards: vi.fn(), push: vi.fn(), refresh: vi.fn() }))
vi.mock('@/api/wristo/design', () => ({ designApi: { getDesignCards: mocks.cards } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ isStudioConsumer: true, userInfo: { id: 1 }, refreshUserInfo: mocks.refresh }) }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
import DesignLimitDialog from './DesignLimitDialog.vue'
let wrapper: ReturnType<typeof mount>
beforeEach(() => {
  vi.clearAllMocks()
  mocks.refresh.mockResolvedValue(undefined)
  wrapper = mount(DesignLimitDialog, { global: { stubs: {
    ElDialog: { props: ['modelValue'], template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>' },
    ElButton: { template: '<button><slot /></button>' },
  } } })
  window.dispatchEvent(new Event('studio-design-limit-reached'))
})
afterEach(() => wrapper.unmount())
const clickPay = async () => { await flushPromises(); await wrapper.findAll('button')[1].trigger('click'); await flushPromises() }
it('opens the existing payment page for the only locked design', async () => {
  mocks.cards.mockResolvedValue({ code: 0, data: { pages: 1, list: [{ designUid: 'draft/a', name: 'Draft' }, { designUid: 'paid', canInstall: true }] } })
  await clickPay()
  expect(mocks.cards).toHaveBeenCalledWith({ scope: 'mine', pageNum: 1, pageSize: 96 })
  expect(mocks.push).toHaveBeenCalledWith('/design-unlocks/draft%2Fa')
})
it('allows choosing between locked designs across pages before payment', async () => {
  mocks.cards.mockResolvedValueOnce({ code: 0, data: { pages: 2, list: [{ designUid: 'a', name: 'A' }] } })
    .mockResolvedValueOnce({ code: 0, data: { pages: 2, list: [{ designUid: 'b', name: 'B' }] } })
  await clickPay()
  expect(mocks.push).not.toHaveBeenCalled()
  await wrapper.get('select').setValue('b')
  await clickPay()
  expect(mocks.push).toHaveBeenCalledWith('/design-unlocks/b')
})
it('shows a retryable error when loading fails', async () => {
  mocks.cards.mockRejectedValue(new Error('offline'))
  await clickPay()
  expect(wrapper.get('[role="alert"]').text()).toBe('membership.unlockLoadFailed')
  expect(mocks.push).not.toHaveBeenCalled()
})
it('takes the editing action to existing designs', async () => {
  await flushPromises()
  await wrapper.findAll('button')[0].trigger('click')
  expect(mocks.push).toHaveBeenCalledWith('/designs')
})
it('ignores a lookup after the dialog has been reopened', async () => {
  let resolve: (value: unknown) => void = () => {}
  mocks.cards.mockReturnValue(new Promise(done => { resolve = done }))
  await clickPay()
  window.dispatchEvent(new Event('studio-design-limit-reached'))
  resolve({ code: 0, data: { pages: 1, list: [{ designUid: 'stale' }] } })
  await flushPromises()
  expect(mocks.push).not.toHaveBeenCalled()
})

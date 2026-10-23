// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ status: vi.fn(), orders: vi.fn(), create: vi.fn(), sync: vi.fn(), open: vi.fn(), user: null as any, callback: null as any }))
vi.mock('@/api/wristo/designUnlocks', () => ({ designUnlocksApi: mocks }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.user }))
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { uid: 'mine' } }) }))
vi.mock('@/utils/paddleCheckout', () => ({ paddleConfigured: () => true, loadPaddle: async () => ({ Checkout: { open: mocks.open, close: vi.fn() } }), onPaddleEvent: (fn: any) => { mocks.callback = fn; return vi.fn() } }))
import DesignUnlock from './DesignUnlock.vue'
let wrapper: ReturnType<typeof mount> | undefined
const order = { id: 'order-1', designUid: 'mine', transactionId: 'txn_unlock', status: 'PENDING' }
const access = { unlocked: false, canInstall: false, priceCents: 199, currency: 'USD', available: true }
const button = (text: string) => wrapper!.findAll('button').find(b => b.text() === text)!
beforeEach(() => {
  vi.clearAllMocks(); sessionStorage.clear()
  mocks.user = reactive({ userInfo: { id: 7 }, refreshUserInfo: vi.fn() })
  mocks.status.mockResolvedValue({ data: access }); mocks.orders.mockResolvedValue({ data: [] })
  mocks.create.mockResolvedValue({ data: order }); mocks.sync.mockResolvedValue({ data: order })
})
afterEach(() => wrapper?.unmount())
const render = async () => { wrapper = mount(DesignUnlock, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } }); await flushPromises() }
it('creates a design-bound checkout without claiming payment success', async () => {
  await render(); await button('Unlock this design · $1.99').trigger('click'); await flushPromises()
  expect(mocks.create).toHaveBeenCalledWith('mine', expect.any(String), 199)
  expect(mocks.open).toHaveBeenCalledWith(expect.objectContaining({ transactionId: 'txn_unlock' }))
  expect(wrapper!.text()).not.toContain('Your design is unlocked')
})
it('resumes an existing pending payment without creating another order', async () => {
  mocks.orders.mockResolvedValue({ data: [order] })
  await render(); await button('Continue payment').trigger('click'); await flushPromises()
  expect(mocks.sync).toHaveBeenCalledWith('mine', 'order-1'); expect(mocks.create).not.toHaveBeenCalled()
})
it('refreshes install rights only after backend confirms payment', async () => {
  mocks.orders.mockResolvedValue({ data: [order] }); await render()
  mocks.sync.mockResolvedValue({ data: { ...order, status: 'PAID' } })
  mocks.status.mockResolvedValue({ data: { ...access, unlocked: true, canInstall: true } })
  mocks.callback({ name: 'checkout.completed', data: { transaction_id: 'txn_unlock' } }); await flushPromises()
  expect(wrapper!.text()).toContain('Your design is unlocked'); expect(mocks.user.refreshUserInfo).toHaveBeenCalled()
})
it('does not open checkout from an obsolete account response', async () => {
  let resolve!: (v: unknown) => void
  mocks.create.mockImplementationOnce(() => new Promise(r => { resolve = r }))
  await render(); await button('Unlock this design · $1.99').trigger('click'); await flushPromises()
  mocks.user.userInfo.id = 8; await flushPromises(); resolve({ data: order }); await flushPromises()
  expect(mocks.open).not.toHaveBeenCalled()
})
it('keeps checkout disabled when the payment product is not configured', async () => {
  mocks.status.mockResolvedValue({ data: { ...access, available: false } }); await render()
  expect(button('Unlock this design · $1.99').attributes('disabled')).toBeDefined()
})

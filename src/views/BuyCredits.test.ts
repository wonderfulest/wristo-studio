// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ packages: vi.fn(), balance: vi.fn(), orders: vi.fn(), createOrder: vi.fn(), order: vi.fn(), syncOrder: vi.fn(), open: vi.fn(), callback: null as any, user: null as any }))
vi.mock('@/api/wristo/studioCredits', () => ({ studioCreditsApi: mocks }))
vi.mock('@/api/wristo/studioAi', () => ({ getAiPrices: vi.fn().mockResolvedValue({ data: { TAGS: 1, DESCRIPTION: 1, BANNER: 1, WATCHFACE: 20, WATCHFACE_ADJUST: 5 } }) }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.user }))
vi.mock('@/utils/paddleCheckout', () => ({ paddleConfigured: () => true, loadPaddle: async () => ({ Checkout: { open: mocks.open, close: vi.fn() } }), onPaddleEvent: (fn: any) => { mocks.callback = fn; return vi.fn() } }))
import BuyCredits from './BuyCredits.vue'
let wrapper: ReturnType<typeof mount> | undefined
const order = { id: 'order-1', packageCode: 'creator', credits: 220, priceCents: 1999, currency: 'USD', transactionId: 'txn_test', status: 'PENDING', refundedCredits: 0, createdAt: '2026-10-05T00:00:00Z' }
beforeEach(() => {
  vi.clearAllMocks(); sessionStorage.clear()
  mocks.user = reactive({ isAuthenticated: true, userInfo: { id: 7, email: 'test@example.com' } })
  mocks.packages.mockResolvedValue({ data: [{ code: 'creator', name: 'Creator', credits: 220, priceCents: 1999, currency: 'USD', recommended: true, available: true }] })
  mocks.balance.mockResolvedValue({ data: { balance: 10 } }); mocks.orders.mockResolvedValue({ data: [] })
  mocks.createOrder.mockResolvedValue({ data: order }); mocks.order.mockResolvedValue({ data: order }); mocks.syncOrder.mockResolvedValue({ data: order })
})
afterEach(() => { wrapper?.unmount(); vi.useRealTimers() })
it('keeps checkout completion pending until the server confirms credits', async () => {
  wrapper = mount(BuyCredits); await flushPromises()
  await wrapper.get('[data-buy="creator"]').trigger('click'); await flushPromises()
  expect(mocks.open).toHaveBeenCalledWith(expect.objectContaining({ transactionId: 'txn_test' }))
  await mocks.callback({ name: 'checkout.completed', data: { transaction_id: 'txn_test' } }); await flushPromises()
  expect(wrapper.text()).not.toContain('Credits added')
  expect(wrapper.text()).toContain('Confirming payment')
  mocks.syncOrder.mockResolvedValue({ data: { ...order, status: 'PAID' } })
  await wrapper.get('[data-check-payment]').trigger('click'); await flushPromises()
  expect(wrapper.text()).toContain('Credits added')
})
it('disables purchases when backend packages are not configured', async () => {
  mocks.packages.mockResolvedValue({ data: [{ code: 'starter', name: 'Starter', credits: 100, priceCents: 999, currency: 'USD', available: false }] })
  wrapper = mount(BuyCredits); await flushPromises()
  expect(wrapper.get('[data-buy="starter"]').attributes('disabled')).toBeDefined()
  expect(wrapper.text()).toContain('Purchases are not available yet')
})
it('uses the same request ID when retrying an uncertain purchase', async () => {
  mocks.createOrder.mockRejectedValueOnce(new Error('network'))
  wrapper = mount(BuyCredits); await flushPromises()
  await wrapper.get('[data-buy="creator"]').trigger('click'); await flushPromises()
  await wrapper.get('[data-buy="creator"]').trigger('click'); await flushPromises()
  expect(mocks.createOrder.mock.calls[0][1]).toBe(mocks.createOrder.mock.calls[1][1])
})
it('does not reopen checkout if payment verification fails', async () => {
  mocks.orders.mockResolvedValue({ data: [order] }); mocks.syncOrder.mockRejectedValue(new Error('offline'))
  wrapper = mount(BuyCredits); await flushPromises()
  const resume = wrapper.findAll('button').find(button => button.text() === 'Resume / Check')!
  await resume.trigger('click'); await flushPromises()
  expect(mocks.open).not.toHaveBeenCalled()
})
it('discards an old account checkout response after changing accounts', async () => {
  let resolve!: (value: any) => void
  mocks.createOrder.mockImplementationOnce(() => new Promise(r => { resolve = r }))
  wrapper = mount(BuyCredits); await flushPromises()
  await wrapper.get('[data-buy="creator"]').trigger('click'); await flushPromises()
  mocks.user.userInfo.id = 8; await flushPromises()
  resolve({ data: order }); await flushPromises()
  expect(mocks.open).not.toHaveBeenCalled()
  expect(wrapper.find('[data-check-payment]').exists()).toBe(false)
})

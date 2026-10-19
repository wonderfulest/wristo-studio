// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ catalog: vi.fn(), balance: vi.fn(), orders: vi.fn(), create: vi.fn(), redeem: vi.fn(), sync: vi.fn(), open: vi.fn(), confirm: vi.fn(), callback: null as any, user: null as any }))
vi.mock('@/api/wristo/designSlots', () => ({ designSlotsApi: mocks }))
vi.mock('@/api/wristo/studioCredits', () => ({ studioCreditsApi: mocks }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.user }))
vi.mock('element-plus', () => ({ ElMessageBox: { confirm: mocks.confirm } }))
vi.mock('@/utils/paddleCheckout', () => ({ paddleConfigured: () => true, loadPaddle: async () => ({ Checkout: { open: mocks.open, close: vi.fn() } }), onPaddleEvent: (fn: any) => { mocks.callback = fn; return vi.fn() } }))
import DesignSlots from './DesignSlots.vue'
let wrapper: ReturnType<typeof mount> | undefined
const order = { id: 'slot-1', slots: 1, priceCents: 100, currency: 'USD', transactionId: 'txn_slots', status: 'PENDING', refundedSlots: 0, createdAt: '2026-10-19T00:00:00Z' }
const button = (text: string) => wrapper!.findAll('button').find(b => b.text() === text)!
beforeEach(() => {
  vi.clearAllMocks(); sessionStorage.clear()
  mocks.user = reactive({ isAuthenticated: true, userInfo: { id: 7 }, studioMembership: { maxDesigns: 3, baseDesignLimit: 3, extraDesignSlots: 0, designCount: 3 }, canCreateDesign: false, refreshUserInfo: vi.fn() })
  mocks.catalog.mockResolvedValue({ data: { creditCost: 100, priceCents: 100, currency: 'USD', creditsAvailable: true, available: true } })
  mocks.balance.mockResolvedValue({ data: { balance: 100 } }); mocks.orders.mockResolvedValue({ data: [order] })
  mocks.create.mockResolvedValue({ data: order }); mocks.sync.mockResolvedValue({ data: order }); mocks.redeem.mockResolvedValue({ data: 1 }); mocks.confirm.mockResolvedValue('confirm')
})
afterEach(() => wrapper?.unmount())
const render = async () => { wrapper = mount(DesignSlots, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } }); await flushPromises() }
it('shows full allowance and both explicit prices', async () => {
  await render(); expect(wrapper!.text()).toContain('3 / 3 designs'); expect(wrapper!.text()).toContain('100 credits'); expect(wrapper!.text()).toContain('$1.00')
})
it('only redeems after confirmation and reuses request on uncertain failure', async () => {
  mocks.redeem.mockRejectedValueOnce(new Error('offline'))
  await render(); await button('Redeem 1 slot').trigger('click'); await flushPromises()
  await button('Redeem 1 slot').trigger('click'); await flushPromises()
  expect(mocks.redeem.mock.calls[0][0]).toBe(mocks.redeem.mock.calls[1][0]); expect(mocks.redeem.mock.calls[0][1]).toBe(100)
  expect(wrapper!.text()).toContain('Your permanent design slot is ready.')
})
it('does not debit when redemption is canceled', async () => {
  mocks.confirm.mockRejectedValueOnce('cancel'); await render(); await button('Redeem 1 slot').trigger('click'); await flushPromises(); expect(mocks.redeem).not.toHaveBeenCalled()
})
it('requires backend payment confirmation before announcing a slot', async () => {
  await render(); await button('Buy 1 slot').trigger('click'); await flushPromises()
  expect(mocks.open).toHaveBeenCalledWith(expect.objectContaining({ transactionId: 'txn_slots' }))
  await mocks.callback({ name: 'checkout.completed', data: { transaction_id: 'txn_slots' } }); await flushPromises()
  expect(wrapper!.text()).not.toContain('Payment confirmed.')
  mocks.sync.mockResolvedValue({ data: { ...order, status: 'PAID' } })
  await button('Check / resume payment').trigger('click'); await flushPromises(); expect(wrapper!.text()).toContain('Payment confirmed.')
})
it('disables unavailable payments and insufficient-credit redemption', async () => {
  mocks.balance.mockResolvedValue({ data: { balance: 99 } }); mocks.catalog.mockResolvedValue({ data: { creditCost: 100, priceCents: 100, creditsAvailable: true, available: false } })
  await render(); expect(button('Buy 1 slot').attributes('disabled')).toBeDefined(); expect(button('Redeem 1 slot').attributes('disabled')).toBeDefined(); expect(wrapper!.text()).toContain('Get credits')
})
it('discards checkout responses belonging to the previous account', async () => {
  let resolve!: (value: unknown) => void
  mocks.create.mockImplementationOnce(() => new Promise(r => { resolve = r }))
  await render(); await button('Buy 1 slot').trigger('click'); await flushPromises()
  mocks.user.userInfo.id = 8; await flushPromises(); resolve({ data: order }); await flushPromises(); expect(mocks.open).not.toHaveBeenCalled()
})

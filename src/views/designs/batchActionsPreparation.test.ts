import { beforeEach, expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({ getDesignByUid: vi.fn(), getPackagingDevices: vi.fn(), submitDesign: vi.fn(), deleteDesign: vi.fn(), submitPrgPackageTask: vi.fn(), cancelIqPackageTask: vi.fn(), cancelPrgPackageTask: vi.fn() }))
const products = vi.hoisted(() => ({ transferOwner: vi.fn(), updateStoreWeight: vi.fn() }))
const sharing = vi.hoisted(() => ({ getDesignSharing: vi.fn(), updateDesignSharing: vi.fn() }))
vi.mock('@/api/wristo/design', () => ({ designApi: api }))
vi.mock('@/api/wristo/products', () => ({ productsApi: products }))
vi.mock('@/api/wristo/designSharing', () => sharing)
import { prepareBatchAction, type BatchAction } from './batchDesignActions'
let detail: any
const item = { id: 1, name: 'Face', designUid: 'one' } as any
const prepare = (action: BatchAction) => prepareBatchAction(item, action, { target: 9, device: 'venu3', weight: 50, enabled: true }, k => k)
beforeEach(() => {
 vi.resetAllMocks()
 detail = { ...item, version: 12, updatedAt: Date.now(), user: { id: 7 }, product: { appId: 101, trialLasts: 4, payment: { paymentMethod: 'wpay', price: 3.99 } } }
 api.getDesignByUid.mockImplementation(async () => ({ code: 0, data: detail }))
 api.getPackagingDevices.mockResolvedValue({ code: 0, data: { selectedDeviceIds: ['venu3'] } })
 for (const mock of [api.submitDesign, api.deleteDesign, api.submitPrgPackageTask, api.cancelIqPackageTask, api.cancelPrgPackageTask, products.transferOwner, products.updateStoreWeight]) mock.mockResolvedValue({ code: 0, data: true })
 sharing.getDesignSharing.mockResolvedValue({ publiclyVisible: false, allowRemix: false, copyEligible: true })
})
it('preserves payment, version and devices without submitting during preparation', async () => {
 const ready = await prepare('submit'); expect(api.submitDesign).not.toHaveBeenCalled(); await ready.run!()
 expect(api.submitDesign).toHaveBeenCalledWith(expect.objectContaining({ price: 3.99, trialLasts: 4, expectedVersion: 12, targetDeviceIds: ['venu3'] }))
})
it('skips active submissions and published deletion', async () => {
 detail.product.packagingLog = { packagingStatus: 'init' }; expect((await prepare('submit')).run).toBeUndefined()
 detail.product.lastGoLive = 1; expect((await prepare('delete')).run).toBeUndefined()
})
it('uses app ids for transfer and weight and patches only the sharing field', async () => {
 await (await prepare('transfer')).run!(); await (await prepare('weight')).run!(); await (await prepare('public')).run!()
 expect(products.transferOwner).toHaveBeenCalledWith(101, 9); expect(products.updateStoreWeight).toHaveBeenCalledWith(101, 50)
 expect(sharing.updateDesignSharing).toHaveBeenCalledWith('one', { publiclyVisible: true })
 sharing.getDesignSharing.mockResolvedValue({ copyEligible: false }); expect((await prepare('remix')).run).toBeUndefined()
})
it('respects cancellation timing and uses the current device for PRG', async () => {
 await (await prepare('prg')).run!(); expect(api.submitPrgPackageTask).toHaveBeenCalledWith('one', 'venu3')
 detail.product.packagingLog = { id: 3, packagingStatus: 'pending', createdAt: Date.now() }
 expect((await prepare('cancelIq')).run).toBeUndefined()
 detail.product.packagingLog.createdAt -= 700000
 await (await prepare('cancelIq')).run!(); expect(api.cancelIqPackageTask).toHaveBeenCalledWith('one', 3)
 detail.product.prgPackagingLog = { ...detail.product.packagingLog, deviceId: 'venu3' }
 await (await prepare('cancelPrg')).run!(); expect(api.cancelPrgPackageTask).toHaveBeenCalledWith('one', 'venu3', 3)
})

it.each([0, 0.25, 720])('reuses saved trial duration %s when repackaging', async (trialLasts) => {
 detail.product.trialLasts = trialLasts
 const ready = await prepare('submit')
 expect(ready.reason).toBeUndefined()
 expect(ready.run).toBeTypeOf('function')
 await ready.run!()
 expect(api.submitDesign).toHaveBeenCalledWith(expect.objectContaining({ paymentMethod: 'wpay', price: 3.99, trialLasts, targetDeviceIds: ['venu3'] }))
})
it.each([undefined, null, -1, 721])('does not invent missing or invalid saved trial duration %s', async (trialLasts) => {
 detail.product.trialLasts = trialLasts
 expect((await prepare('submit')).reason).toBe('batchActions.missingConfig')
 expect(api.submitDesign).not.toHaveBeenCalled()
})

it('fills missing shared configuration once while retaining identity and version', async () => {
 detail.product.payment = undefined
 detail.product.trialLasts = undefined
 api.getPackagingDevices.mockResolvedValue({ code: 0, data: { devices: [{ deviceId: 'venu3' }], selectedDeviceIds: [] } })
 const ready = await prepareBatchAction(item, 'submit', { device: '', enabled: false, weight: 0, submitConfig: { paymentMethod: 'wpay', price: 2.39, trialLasts: 0.25, targetDeviceIds: ['venu3'] } }, k => k)
 expect(ready.reason).toBeUndefined()
 expect(api.submitDesign).not.toHaveBeenCalled()
 await ready.run!()
 expect(api.submitDesign).toHaveBeenCalledWith(expect.objectContaining({ designUid: 'one', name: 'Face', expectedVersion: 12, paymentMethod: 'wpay', price: 2.39, trialLasts: 0.25, targetDeviceIds: ['venu3'] }))
})
it('a price-only edit preserves the saved method, trial and devices', async () => {
 const ready = await prepareBatchAction(item, 'submit', { device: '', enabled: false, weight: 0, submitConfig: { price: 4.99 } }, k => k)
 await ready.run!()
 expect(api.submitDesign).toHaveBeenCalledWith(expect.objectContaining({ price: 4.99, paymentMethod: 'wpay', trialLasts: 4, targetDeviceIds: ['venu3'] }))
})
it('validates empty and unsupported shared devices', async () => {
 for (const targetDeviceIds of [[], ['unknown']]) {
  const ready = await prepareBatchAction(item, 'submit', { device: '', enabled: false, weight: 0, submitConfig: { targetDeviceIds } }, k => k)
  expect(ready.run).toBeUndefined()
 }
 expect(api.submitDesign).not.toHaveBeenCalled()
})
it('does not change a published payment method through a shared edit', async () => {
 detail.product.lastGoLive = 123
 const ready = await prepareBatchAction(item, 'submit', { device: '', enabled: false, weight: 0, submitConfig: { paymentMethod: 'free' } }, k => k)
 expect(ready.reason).toBe('payment.methodLockedAfterPublish')
 expect(ready.run).toBeUndefined()
})
it('free submissions omit paid fields even with shared paid values', async () => {
 const ready = await prepareBatchAction(item, 'submit', { device: '', enabled: false, weight: 0, submitConfig: { paymentMethod: 'free', price: 4.99, trialLasts: 1 } }, k => k)
 await ready.run!()
 const payload = api.submitDesign.mock.calls[0][0]
 expect(payload.paymentMethod).toBe('free')
 expect(payload).not.toHaveProperty('price')
 expect(payload).not.toHaveProperty('trialLasts')
})

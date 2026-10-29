import { expect, it } from 'vitest'
import { summarizeSubmitConfig, type BatchSubmitSnapshot } from './batchSubmitConfig'
const snapshot = (method: string, price: number, ids: string[], available = ids) => ({
 design: { product: { payment: { paymentMethod: method, price }, trialLasts: 0 } },
 devices: { devices: available.map(deviceId => ({ deviceId, displayName: deviceId })), selectedDeviceIds: ids },
}) as BatchSubmitSnapshot
it('prefills identical settings, treating device order as irrelevant', () => {
 const summary = summarizeSubmitConfig([snapshot('wpay', 2.39, ['a', 'b']), snapshot('wpay', 2.39, ['b', 'a'])])
 expect(summary.values).toEqual({ paymentMethod: 'wpay', price: 2.39, trialLasts: 0, targetDeviceIds: ['a', 'b'] })
 expect(Object.values(summary.mixed).some(Boolean)).toBe(false)
})
it('marks mixed values without copying the first design and intersects supported devices', () => {
 const summary = summarizeSubmitConfig([snapshot('wpay', 2.39, ['a'], ['a', 'b']), snapshot('free', 0, ['b'], ['b', 'c'])])
 expect(summary.values).toEqual({ trialLasts: 0 })
 expect(summary.mixed).toEqual({ paymentMethod: true, price: true, trialLasts: false, targetDeviceIds: true })
 expect(summary.devices.map(d => d.deviceId)).toEqual(['b'])
})

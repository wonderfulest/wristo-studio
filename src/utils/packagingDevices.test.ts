import { describe, expect, it } from 'vitest'
import { comparePackagingDevices } from './packagingDevices'

describe('packaging device priority', () => {
  it('puts unsupported first, unknown next, and supported last regardless of memory', () => {
    const devices = [
      { deviceId: 'supported', memoryBytes: 524288, supportsExtendedCode: true },
      { deviceId: 'unknown', memoryBytes: 131072 },
      { deviceId: 'unsupported-b', memoryBytes: 65536, supportsExtendedCode: false },
      { deviceId: 'unsupported-a', memoryBytes: 131072, supportsExtendedCode: false },
    ]
    expect(devices.sort(comparePackagingDevices).map(d => d.deviceId)).toEqual([
      'unsupported-a', 'unsupported-b', 'unknown', 'supported',
    ])
  })
  it('sorts missing memory last within a group and uses the device ID for ties', () => {
    const devices = [
      { deviceId: 'z', memoryBytes: null },
      { deviceId: 'b', memoryBytes: 131072 },
      { deviceId: 'a', memoryBytes: 131072 },
    ]
    expect(devices.sort(comparePackagingDevices).map(d => d.deviceId)).toEqual(['a', 'b', 'z'])
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useDesignStore } from './designStore'

describe('designStore Connect IQ data exclusions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('normalizes finite nonnegative integer values and strict decimal strings', () => {
    const store = useDesignStore()

    store.setConnectIqSettingsExcludedDataTypeValues([
      31,
      '2',
      31,
      null,
      true,
      false,
      4.5,
      -1,
      Number.POSITIVE_INFINITY,
      ' 3',
      '4.0',
      'bad',
      Number.MAX_SAFE_INTEGER + 1,
      String(Number.MAX_SAFE_INTEGER + 1),
      '999999999999999999999999999999999999999999999999',
    ])

    expect(store.connectIqSettingsExcludedDataTypeValues).toEqual([2, 31])
  })

  it('keeps the maximum safe value without allowing unsafe numbers to collide with it', () => {
    const store = useDesignStore()

    store.setConnectIqSettingsExcludedDataTypeValues([
      Number.MAX_SAFE_INTEGER,
      String(Number.MAX_SAFE_INTEGER),
      Number.MAX_SAFE_INTEGER + 1,
      '9007199254740992',
      '9007199254740993',
    ])

    expect(store.connectIqSettingsExcludedDataTypeValues).toEqual([Number.MAX_SAFE_INTEGER])
  })

  it('keeps stale numeric exclusions and adds or removes exactly the selected value', () => {
    const store = useDesignStore()
    store.setConnectIqSettingsExcludedDataTypeValues([999, 31])

    expect(store.setConnectIqDataTypeSelected(31, true)).toBe(true)
    expect(store.connectIqSettingsExcludedDataTypeValues).toEqual([999])

    expect(store.setConnectIqDataTypeSelected(2, false)).toBe(true)
    expect(store.connectIqSettingsExcludedDataTypeValues).toEqual([2, 999])

    expect(store.setConnectIqDataTypeSelected(2, false)).toBe(false)
    expect(store.connectIqSettingsExcludedDataTypeValues).toEqual([2, 999])
  })

  it('preserves the array reference when normalization or selection makes no change', () => {
    const store = useDesignStore()
    store.setConnectIqSettingsExcludedDataTypeValues([2, 31])
    const reference = store.connectIqSettingsExcludedDataTypeValues

    store.setConnectIqSettingsExcludedDataTypeValues([31, '2', 31])
    expect(store.connectIqSettingsExcludedDataTypeValues).toBe(reference)

    expect(store.setConnectIqDataTypeSelected(31, false)).toBe(false)
    expect(store.connectIqSettingsExcludedDataTypeValues).toBe(reference)
    expect(store.setConnectIqDataTypeSelected('bad', false)).toBe(false)
    expect(store.connectIqSettingsExcludedDataTypeValues).toBe(reference)
  })

  it('ignores invalid values in the single-selection action', () => {
    const store = useDesignStore()
    store.setConnectIqSettingsExcludedDataTypeValues([31])

    store.setConnectIqDataTypeSelected(4.5, false)
    store.setConnectIqDataTypeSelected('bad', false)

    expect(store.connectIqSettingsExcludedDataTypeValues).toEqual([31])
  })

  it('bulk-replaces normalized exclusions and reports whether history should be saved', () => {
    const store = useDesignStore()
    store.setConnectIqSettingsExcludedDataTypeValues([2, 999])

    expect(store.replaceConnectIqDataTypeExclusions([999])).toBe(true)
    expect(store.connectIqSettingsExcludedDataTypeValues).toEqual([999])
    expect(store.replaceConnectIqDataTypeExclusions(['999', 999])).toBe(false)
  })
})

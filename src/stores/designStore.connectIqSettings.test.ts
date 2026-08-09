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
    ])

    expect(store.connectIqSettingsExcludedDataTypeValues).toEqual([2, 31])
  })

  it('keeps stale numeric exclusions and adds or removes exactly the selected value', () => {
    const store = useDesignStore()
    store.setConnectIqSettingsExcludedDataTypeValues([999, 31])

    store.setConnectIqDataTypeSelected(31, true)
    expect(store.connectIqSettingsExcludedDataTypeValues).toEqual([999])

    store.setConnectIqDataTypeSelected(2, false)
    expect(store.connectIqSettingsExcludedDataTypeValues).toEqual([2, 999])

    store.setConnectIqDataTypeSelected(2, false)
    expect(store.connectIqSettingsExcludedDataTypeValues).toEqual([2, 999])
  })

  it('ignores invalid values in the single-selection action', () => {
    const store = useDesignStore()
    store.setConnectIqSettingsExcludedDataTypeValues([31])

    store.setConnectIqDataTypeSelected(4.5, false)
    store.setConnectIqDataTypeSelected('bad', false)

    expect(store.connectIqSettingsExcludedDataTypeValues).toEqual([31])
  })
})

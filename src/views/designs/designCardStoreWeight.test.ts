import { describe, expect, it } from 'vitest'
import {
  DEFAULT_STORE_WEIGHT,
  normalizeStoreWeight,
  shouldSubmitStoreWeight,
} from './designCardStoreWeight'

describe('design card Store weight', () => {
  it('uses the backend default for a missing value', () => {
    expect(normalizeStoreWeight(null)).toBe(DEFAULT_STORE_WEIGHT)
    expect(normalizeStoreWeight(undefined)).toBe(DEFAULT_STORE_WEIGHT)
  })

  it('normalizes values to integer range 0-99', () => {
    expect(normalizeStoreWeight(-2)).toBe(0)
    expect(normalizeStoreWeight(18.7)).toBe(19)
    expect(normalizeStoreWeight(120)).toBe(99)
  })

  it('submits only a changed value that is not already pending', () => {
    expect(shouldSubmitStoreWeight(30, 20, null)).toBe(true)
    expect(shouldSubmitStoreWeight(20, 20, null)).toBe(false)
    expect(shouldSubmitStoreWeight(30, 20, 30)).toBe(false)
  })
})

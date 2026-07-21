import { describe, expect, it } from 'vitest'
import {
  GARMIN_PAYMENT_METHOD,
  isGarminPayment,
  isPaymentMethodLocked,
  normalizeTrialLasts,
} from './paymentMethod'

describe('Garmin official payment rules', () => {
  it('uses the stable garmin code', () => {
    expect(GARMIN_PAYMENT_METHOD).toBe('garmin')
    expect(isGarminPayment('garmin')).toBe(true)
    expect(isGarminPayment('garmin_pay')).toBe(false)
  })

  it('forces Garmin and free trial durations to zero', () => {
    expect(normalizeTrialLasts('garmin', 12)).toBe(0)
    expect(normalizeTrialLasts('free', 12)).toBe(0)
    expect(normalizeTrialLasts('wpay', 12)).toBe(12)
  })

  it('locks the payment method whenever first go-live has been recorded', () => {
    expect(isPaymentMethodLocked(null)).toBe(false)
    expect(isPaymentMethodLocked(undefined)).toBe(false)
    expect(isPaymentMethodLocked(0)).toBe(true)
    expect(isPaymentMethodLocked('2026-07-21T12:00:00')).toBe(true)
  })
})

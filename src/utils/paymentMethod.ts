export const GARMIN_PAYMENT_METHOD = 'garmin' as const

export type StudioPaymentMethod = 'free' | 'wpay' | typeof GARMIN_PAYMENT_METHOD

export const isGarminPayment = (paymentMethod?: string | null) =>
  paymentMethod === GARMIN_PAYMENT_METHOD

export const normalizeTrialLasts = (paymentMethod: string, trialLasts?: number | null) =>
  paymentMethod === 'free' || isGarminPayment(paymentMethod) ? 0 : Number(trialLasts || 0)

export const isPaymentMethodLocked = (lastGoLive?: number | string | null) =>
  lastGoLive !== null && lastGoLive !== undefined && lastGoLive !== ''

export const DEFAULT_STORE_WEIGHT = 20
export const MIN_STORE_WEIGHT = 0
export const MAX_STORE_WEIGHT = 99

export const normalizeStoreWeight = (value: number | null | undefined): number => {
  if (value == null) return DEFAULT_STORE_WEIGHT
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return DEFAULT_STORE_WEIGHT
  return Math.min(MAX_STORE_WEIGHT, Math.max(MIN_STORE_WEIGHT, Math.round(numericValue)))
}

export const shouldSubmitStoreWeight = (
  nextValue: number,
  persistedValue: number,
  pendingValue: number | null,
): boolean => nextValue !== persistedValue && nextValue !== pendingValue

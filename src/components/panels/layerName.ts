export const normalizeLayerName = (value: unknown): string | undefined => {
  const normalized = String(value ?? '').trim()
  return normalized || undefined
}

export const resolveLayerName = (customName: unknown, typeLabel: string): string => {
  return normalizeLayerName(customName) ?? typeLabel
}

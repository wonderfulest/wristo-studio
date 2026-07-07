export const DATA_NUMBER_FORMAT_AUTO = 0
export const DATA_NUMBER_FORMAT_PLAIN = 1
export const DATA_NUMBER_FORMAT_GROUPED = 2
export const DATA_NUMBER_FORMAT_COMPACT = 3

export type DataNumberFormatMode =
  | typeof DATA_NUMBER_FORMAT_AUTO
  | typeof DATA_NUMBER_FORMAT_PLAIN
  | typeof DATA_NUMBER_FORMAT_GROUPED
  | typeof DATA_NUMBER_FORMAT_COMPACT

export const DEFAULT_MAX_FIELD_LENGTH = 4

export function normalizeDataNumberFormatMode(value: unknown): DataNumberFormatMode {
  const n = Number(value)
  if (
    n === DATA_NUMBER_FORMAT_PLAIN ||
    n === DATA_NUMBER_FORMAT_GROUPED ||
    n === DATA_NUMBER_FORMAT_COMPACT
  ) {
    return n
  }
  return DATA_NUMBER_FORMAT_AUTO
}

export function normalizeMaxFieldLength(value: unknown, fallback = DEFAULT_MAX_FIELD_LENGTH): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(1, Math.min(12, Math.round(n)))
}

function isNumericDisplay(value: string): boolean {
  return /^[-+]?\d+(?:\.\d+)?$/.test(value.replace(/,/g, '').trim())
}

function toPlainString(value: number, rawDisplay: string): string {
  const normalizedRaw = String(rawDisplay ?? '').replace(/,/g, '').trim()
  if (isNumericDisplay(normalizedRaw)) return normalizedRaw
  if (Number.isInteger(value)) return String(value)
  return String(value)
}

function formatGrouped(value: number, rawDisplay: string): string {
  const plain = toPlainString(value, rawDisplay)
  const sign = plain.startsWith('-') || plain.startsWith('+') ? plain.slice(0, 1) : ''
  const unsigned = sign ? plain.slice(1) : plain
  const [integer, fraction] = unsigned.split('.')
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}${grouped}${fraction ? `.${fraction}` : ''}`
}

function formatCompact(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  const units = [
    { threshold: 1_000_000_000, suffix: 'B' },
    { threshold: 1_000_000, suffix: 'M' },
    { threshold: 1_000, suffix: 'k' },
  ]
  const unit = units.find((item) => abs >= item.threshold)
  if (!unit) return Number.isInteger(value) ? String(value) : String(value)
  const scaled = abs / unit.threshold
  const text = scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1).replace(/\.0$/, '')
  return `${sign}${text}${unit.suffix}`
}

export function formatDataNumberDisplay(
  rawDisplay: unknown,
  numericValue: unknown,
  mode: unknown,
  maxFieldLength: unknown,
): string {
  const raw = String(rawDisplay ?? '')
  const plainRaw = raw.replace(/,/g, '').trim()
  const parsedValue =
    typeof numericValue === 'number' && Number.isFinite(numericValue)
      ? numericValue
      : Number(plainRaw)

  if (!Number.isFinite(parsedValue) || !isNumericDisplay(plainRaw)) {
    return raw
  }

  const normalizedMode = normalizeDataNumberFormatMode(mode)
  const normalizedMax = normalizeMaxFieldLength(maxFieldLength)
  const plain = toPlainString(parsedValue, raw)
  const grouped = formatGrouped(parsedValue, raw)
  const compact = formatCompact(parsedValue)

  if (normalizedMode === DATA_NUMBER_FORMAT_PLAIN) return plain
  if (normalizedMode === DATA_NUMBER_FORMAT_GROUPED) return grouped
  if (normalizedMode === DATA_NUMBER_FORMAT_COMPACT) return compact

  if (grouped.length <= normalizedMax) return grouped
  if (plain.length <= normalizedMax) return plain
  return compact
}

export type AmoledIconSelectionSource = 'manual' | 'from-element'

export interface AmoledIconCandidate {
  iconUnicode: string
  symbolCode?: string
  metricSymbol?: string
  label?: string
  source: AmoledIconSelectionSource
}

export const normalizeIconUnicode = (value: unknown): string => {
  return String(value ?? '').trim().replace(/^\\u/i, '').replace(/^U\+/i, '').replace(/^0x/i, '').toLowerCase()
}

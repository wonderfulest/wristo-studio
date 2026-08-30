export type TokenFormatMode = 'string' | 'integer' | 'float'

export interface TokenFormatDraft {
  mode: TokenFormatMode
  width: number | null
  precision: number | null
  zeroPad: boolean
  grouped: boolean
}

export interface TokenFormatTarget {
  code: string
  start: number
  end: number
  format?: string
}

const TOKEN_WITH_FORMAT_PATTERN = /\(([A-Za-z][A-Za-z0-9_.]*)\)(?:\.format\("(%(?:,)?(?:0)?(?:\d+)?(?:\.\d+)?[sdf])"\))?/g
const FORMAT_PATTERN = /^%(,)?(0)?(\d+)?(?:\.(\d+))?([sdf])$/

export const findTokenFormatTarget = (source: string, caret: number): TokenFormatTarget | null => {
  const safeCaret = Math.max(0, Math.min(caret, source.length))
  let nearest: TokenFormatTarget | null = null

  for (const match of source.matchAll(TOKEN_WITH_FORMAT_PATTERN)) {
    const start = match.index ?? 0
    if (start > safeCaret) break
    nearest = {
      code: match[1],
      start,
      end: start + match[0].length,
      format: match[2],
    }
  }

  return nearest
}

export const parseTokenFormat = (format: string): TokenFormatDraft => {
  const match = FORMAT_PATTERN.exec(format)
  if (!match) return { mode: 'float', width: null, precision: null, zeroPad: false, grouped: false }

  const mode: TokenFormatMode = match[5] === 's' ? 'string' : match[5] === 'd' ? 'integer' : 'float'
  return {
    mode,
    width: match[3] ? Number(match[3]) : null,
    precision: match[4] === undefined ? null : Number(match[4]),
    zeroPad: Boolean(match[2]),
    grouped: Boolean(match[1]),
  }
}

export const buildTokenFormat = (draft: TokenFormatDraft): string => {
  if (draft.mode === 'string') return '%s'
  const width = draft.width === null ? '' : String(Math.min(12, Math.max(1, draft.width)))
  const precision = draft.mode === 'float' && draft.precision !== null
    ? `.${Math.min(6, Math.max(0, draft.precision))}`
    : ''
  return `%${draft.grouped ? ',' : ''}${draft.zeroPad && width ? '0' : ''}${width}${precision}${draft.mode === 'integer' ? 'd' : 'f'}`
}

export const replaceTokenFormat = (source: string, target: TokenFormatTarget, format: string) => {
  const replacement = `(${target.code}).format("${format}")`
  const value = `${source.slice(0, target.start)}${replacement}${source.slice(target.end)}`
  return { value, caret: target.start + replacement.length }
}

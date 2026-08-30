import { describe, expect, it } from 'vitest'
import {
  buildTokenFormat,
  findTokenFormatTarget,
  parseTokenFormat,
  replaceTokenFormat,
} from './tokenFormattingEditor'

describe('tokenFormattingEditor', () => {
  it('finds the nearest token to the left of the caret', () => {
    const source = '(dt1.1) + " " + (tm2)'

    expect(findTokenFormatTarget(source, source.length)).toEqual({
      code: 'tm2',
      start: 16,
      end: 21,
      format: undefined,
    })
    expect(findTokenFormatTarget(source, 8)?.code).toBe('dt1.1')
  })

  it('includes an existing format call in the replacement target', () => {
    const source = '(tm2).format("%02d")'

    expect(findTokenFormatTarget(source, source.length)).toEqual({
      code: 'tm2',
      start: 0,
      end: source.length,
      format: '%02d',
    })
  })

  it('returns no target when the caret has no token to its left', () => {
    expect(findTokenFormatTarget('Prefix (tm2)', 3)).toBeNull()
  })

  it.each([
    ['%s', { mode: 'string', width: null, precision: null, zeroPad: false, grouped: false }],
    ['%06d', { mode: 'integer', width: 6, precision: null, zeroPad: true, grouped: false }],
    ['%,8.2f', { mode: 'float', width: 8, precision: 2, zeroPad: false, grouped: true }],
  ])('parses %s into an editable draft', (format, expected) => {
    expect(parseTokenFormat(format)).toEqual(expected)
  })

  it('builds combined width, precision, zero-padding and grouping formats', () => {
    expect(buildTokenFormat({ mode: 'float', width: 8, precision: 2, zeroPad: true, grouped: true })).toBe('%,08.2f')
    expect(buildTokenFormat({ mode: 'integer', width: null, precision: null, zeroPad: true, grouped: true })).toBe('%,d')
    expect(buildTokenFormat({ mode: 'string', width: 8, precision: 2, zeroPad: true, grouped: true })).toBe('%s')
  })

  it('replaces an existing format instead of appending another one', () => {
    const source = '(dt1.1) + " " + (tm2).format("%02d")'
    const target = findTokenFormatTarget(source, source.length)

    expect(replaceTokenFormat(source, target!, '%06d')).toEqual({
      value: '(dt1.1) + " " + (tm2).format("%06d")',
      caret: 36,
    })
  })
})

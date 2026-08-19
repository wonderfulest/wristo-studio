// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { encodeDate, decodeDate } from './date.encoder'

describe('date formatter options persistence', () => {
  it('encodes each date element formatter option order', () => {
    const encoded = encodeDate({
      id: 'date-1', eleType: 'date', left: 10, top: 20,
      originX: 'center', originY: 'center', fontSize: 20,
      fill: '#ffffff', formatter: 38, formatterOptions: [38, 20, 27],
    } as any)

    expect(encoded.formatterOptions).toEqual([38, 20, 27])
  })

  it('decodes formatter options back onto the live element', () => {
    const decoded = decodeDate({
      id: 'date-1', eleType: 'date', left: 10, top: 20,
      originX: 'center', originY: 'center', fontSize: 20,
      fill: '#ffffff', formatter: 38, formatterOptions: [38, 20],
    } as any)

    expect((decoded as any).formatterOptions).toEqual([38, 20])
  })

  it('preserves the shared date property binding through encode and decode', () => {
    const encoded = encodeDate({
      id: 'date-shared', eleType: 'date', left: 10, top: 20,
      originX: 'center', originY: 'center', fontFamily: 'roboto', fontSize: 18,
      fill: '#ffffff', formatter: 31, formatterOptions: [31, 32], dateProperty: 'date_1',
    } as any)

    expect(encoded.dateProperty).toBe('date_1')
    expect((decodeDate(encoded) as any).dateProperty).toBe('date_1')
  })
})

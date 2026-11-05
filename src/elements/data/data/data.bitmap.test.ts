// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { encodeData, decodeData } from './data.encoder'
const base = { id: 'steps', eleType: 'data', left: 100, top: 100, fontSize: 32, fontFamily: 'old-font', dataProperty: 'steps', metricSymbol: ':FIELD_TYPE_STEPS', bitmapFontId: 42, fontGap: -2 }
it('round trips bitmap data without losing its binding or signed spacing', () => {
  const encoded = encodeData({ ...base, fontRenderType: 'bitmap' } as any)
  expect(encoded).toMatchObject({ fontRenderType: 'bitmap', bitmapFontId: 42, fontGap: -2, dataProperty: 'steps' })
  expect(decodeData(encoded)).toMatchObject({ fontRenderType: 'bitmap', bitmapFontId: 42, fontGap: -2 })
})
it('does not retain stale bitmap dependencies in legacy text data', () => {
  expect(encodeData(base as any)).not.toHaveProperty('bitmapFontId')
  expect(decodeData(base as any)).not.toHaveProperty('bitmapFontId')
})

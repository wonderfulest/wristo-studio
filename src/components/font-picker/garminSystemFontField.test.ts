import { describe, expect, it } from 'vitest'
import { buildGarminFontSelectionPatch } from './garminSystemFontField'

describe('Garmin system font field', () => {
  it('stores a system symbol independently from the asset font', () => {
    expect(buildGarminFontSelectionPatch('FONT_SMALL')).toEqual({
      fontSource: 'system',
      systemFont: 'FONT_SMALL',
    })
  })

  it('clears the symbol when switching back to an asset font', () => {
    expect(buildGarminFontSelectionPatch('asset')).toEqual({
      fontSource: 'asset',
      systemFont: undefined,
    })
  })
})

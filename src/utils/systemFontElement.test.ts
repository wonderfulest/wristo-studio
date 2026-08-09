import { describe, expect, it } from 'vitest'
import { getPersistedTextFont } from './systemFontElement'

describe('system font persistence', () => {
  it('keeps the business font selection instead of the Fabric preview font', () => {
    expect(getPersistedTextFont({
      fontSource: 'system',
      systemFont: 'FONT_SMALL',
      fontFamily: 'roboto-condensed-regular',
      fontSize: 18,
    }, {
      fontSource: 'system',
      systemFont: 'FONT_SMALL',
      fontFamily: 'Roboto',
      fontSize: 44,
      assetFontFamily: 'roboto-condensed-regular',
      assetFontSize: 18,
    })).toEqual({
      fontSource: 'system',
      systemFont: 'FONT_SMALL',
      fontFamily: 'roboto-condensed-regular',
      fontSize: 18,
    })
  })
})

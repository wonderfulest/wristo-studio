// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { isAllowedAnalogAssetFile } from './assetUploadValidation'

describe('analog dial asset upload validation', () => {
  it.each(['tick12', 'tick60', 'romans'] as const)('accepts PNG files for %s', (assetType) => {
    const png = new File(['png'], 'dial.png', { type: 'image/png' })

    expect(isAllowedAnalogAssetFile(png, assetType)).toBe(true)
  })

  it('keeps unrelated vector-only asset types restricted to SVG', () => {
    const png = new File(['png'], 'wind.png', { type: 'image/png' })

    expect(isAllowedAnalogAssetFile(png, 'windDirection')).toBe(false)
  })
})

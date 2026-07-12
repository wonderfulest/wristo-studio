import { describe, expect, it } from 'vitest'
import { buildSubDialRangePatch, buildSubDialPointerAssetPatch } from './subDial.panelModel'

describe('subDial panel model', () => {
  it('fixes percentage ranges at zero to one hundred', () => {
    expect(buildSubDialRangePatch('percentage', 20, 80)).toEqual({
      rangeMode: 'percentage',
      minValue: 0,
      maxValue: 100,
    })
  })

  it('accepts a valid custom range', () => {
    expect(buildSubDialRangePatch('custom', 40, 200)).toEqual({
      rangeMode: 'custom',
      minValue: 40,
      maxValue: 200,
    })
  })

  it('rejects an invalid custom range', () => {
    expect(() => buildSubDialRangePatch('custom', 100, 100)).toThrow('Maximum must be greater than minimum')
  })

  it('stores the stable original asset url for image pointers', () => {
    expect(buildSubDialPointerAssetPatch('preview.png', {
      id: 42,
      file: { url: 'original.svg', previewUrl: 'preview.png' },
    })).toEqual({
      style: 'image',
      assetId: '42',
      imageUrl: 'original.svg',
    })
  })
})

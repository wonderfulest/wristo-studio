import { describe, expect, it } from 'vitest'
import { isEditableSvgAssetSource } from './assetEditability'

describe('isEditableSvgAssetSource', () => {
  it.each(['tick12', 'tick60'] as const)('allows %s SVG assets', (assetType) => {
    expect(isEditableSvgAssetSource(assetType, 'https://cdn.example/ticks.svg', '')).toBe(true)
    expect(isEditableSvgAssetSource(assetType, '', 'ticks.svg')).toBe(true)
  })

  it.each(['tick12', 'tick60'] as const)('rejects %s PNG assets', (assetType) => {
    expect(isEditableSvgAssetSource(assetType, 'https://cdn.example/ticks.png', 'ticks.png')).toBe(false)
  })

  it('does not enable romans SVG editing', () => {
    expect(isEditableSvgAssetSource('romans', 'https://cdn.example/romans.svg', '')).toBe(false)
  })

  it('recognizes SVG URLs with query strings case-insensitively', () => {
    expect(isEditableSvgAssetSource('tick12', 'https://cdn.example/TICKS.SVG?v=2', '')).toBe(true)
  })
})

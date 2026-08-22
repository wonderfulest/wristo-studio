import { describe, expect, it, vi } from 'vitest'
import type { SvgIconFontSlot } from '@/features/bitmap-font-maker/svgIconPackageBuilder'
import { loadSvgIconBuildSources } from './svgIconBuildSources'

const slots: SvgIconFontSlot[] = [
  { iconUnicode: '0030', codepoint: 0x30, symbolCode: 'heart_rate', label: 'Heart rate' },
  { iconUnicode: '0031', codepoint: 0x31, symbolCode: 'steps', label: 'Steps' },
]

describe('loadSvgIconBuildSources', () => {
  it('loads every required ordinary SVG in system slot order', async () => {
    const relations = [...slots].reverse().map((slot, index) => ({
      id: index + 1,
      glyphId: 7,
      assetId: index + 10,
      version: 1,
      isActive: 1,
      icon: { id: index + 20, iconUnicode: slot.iconUnicode, symbolCode: slot.symbolCode, category: 'field', label: slot.label, isActive: 1 },
      asset: { id: index + 10, iconId: index + 20, sourceType: 'custom', format: 'svg', svgContent: '<svg></svg>' },
    }))

    const sources = await loadSvgIconBuildSources(slots, relations, vi.fn())
    expect(sources.map((source) => source.iconUnicode)).toEqual(['0030', '0031'])
  })

  it('rejects the build when one system ordinary icon has no SVG', async () => {
    await expect(loadSvgIconBuildSources(slots, [], vi.fn())).rejects.toThrow('SVG_ICON_SOURCE_SET_INCOMPLETE')
  })
})

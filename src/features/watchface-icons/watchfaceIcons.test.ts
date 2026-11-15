import { describe, expect, it, vi } from 'vitest'
vi.mock('@/utils/amoledIconCandidates', () => ({ getAmoledIconCandidateFromElement: () => null }))
import { resolveWatchfaceIconImage, collectAvailableIcons, collectWatchfaceIcons, iconImagePatch, readIconImage } from './watchfaceIcons'
const icon = (id: string, fontFamily = 'wristo-icon', extra = {}) => ({ id, eleType: 'icon', config: { id, eleType: 'icon', fontFamily, iconUnicode: '0063', ...extra } }) as any

describe('watchface icons', () => {
  it('includes hidden and ambient icons and separates fonts', () => {
    const groups = collectWatchfaceIcons([
      icon('a'),
      icon('b', 'wristo-icon', { visible: false, displayStates: { active: false, ambient: true } }),
      icon('c', 'other'),
      { id: 'image', eleType: 'image', config: {} } as any
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0].elements.map((e) => e.id)).toEqual(['a', 'b'])
  })
  it('preserves independent sizes and positions when replacing', () => {
    expect(iconImagePatch({ fontSize: 30, left: 20 }, '0063', 'data:image/png;base64,test')).toMatchObject({ width: 30, height: 30, iconDisplayType: 'amoled' })
    expect(iconImagePatch({ fontSize: 30 }, '0063', 'data:test')).not.toHaveProperty('left')
  })
  it('clears both image sources when restoring the default', () => {
    expect(iconImagePatch({}, '0063', '')).toMatchObject({ iconDisplayType: 'mip', amoledImageUrl: '', imageUrl: '', text: '0063' })
  })
  it('rejects unsupported files before reading them', async () => {
    await expect(readIconImage({ name: 'photo.jpg', type: 'image/jpeg', size: 30 } as File)).rejects.toThrow('PNG / SVG')
  })
})

it('includes all weather codes for each used weather font and keeps replacements separate', () => {
  const weather = { id: 'weather', eleType: 'weather', config: { eleType: 'weather', fontFamily: 'weather-font', iconUnicode: '102D' } } as any
  const icons = collectAvailableIcons([weather], [], [], 'wristo-icon', 'zh')
  expect(icons).toHaveLength(12)
  expect(icons.find(i => i.key === 'weather-font::102d')?.elements).toEqual([weather])
  expect(iconImagePatch(weather.config, '102d', 'custom.png')).toEqual({ amoledImageUrl: 'custom.png' })
  expect(iconImagePatch(weather.config, '102d', '')).toEqual({ amoledImageUrl: '' })
})

it('prefers an uploaded library image over the default glyph and respects explicit removal', () => {
  const asset = { id: 'wristo-icon::0063', kind: 'override', name: 'Heart', fontSlug: 'wristo-icon', unicode: '0063', imageUrl: '/heart.png' } as const
  expect(resolveWatchfaceIconImage({ fontFamily: 'wristo-icon', iconDisplayType: 'mip' }, [asset], '0063')).toMatchObject({ iconDisplayType: 'amoled', amoledImageUrl: '/heart.png' })
  expect(resolveWatchfaceIconImage({ fontFamily: 'wristo-icon', amoledImageUrl: '' }, [asset], '0063')).toEqual({})
})

it('keeps legacy uploaded images usable without a separate library entry', () => {
  expect(resolveWatchfaceIconImage({ iconDisplayType: 'mip', amoledImageUrl: '/heart.png', amoledIconUnicode: '0063' }, [], '0063')).toMatchObject({ iconDisplayType: 'amoled', amoledImageUrl: '/heart.png' })
  expect(resolveWatchfaceIconImage({ amoledImageUrl: '/heart.png', amoledIconUnicode: '0063' }, [], '0064')).toEqual({})
})

import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useVisualThemeStore } from './visualThemeStore'
import type { RuntimeDesignConfig } from '@/types/app/config'

const design = {
  version: '1',
  properties: {},
  designId: 'design-1',
  name: 'Design',
  textCase: 0,
  bitmapMode: false,
  elements: [
    { eleType: 'background', imageId: 11, imageUrl: 'https://cdn.example/background.svg' },
    { eleType: 'hourHand', assetId: 12, imageUrl: 'https://cdn.example/hour.svg' },
    { eleType: 'minuteHand', assetId: 13, imageUrl: 'https://cdn.example/minute.svg' },
  ],
  orderIds: [],
} as unknown as RuntimeDesignConfig

const ids = (...values: string[]) => {
  let index = 0
  return () => values[index++]
}

describe('visualThemeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('hydrates persistent config without persisting the editor preview', () => {
    const store = useVisualThemeStore()
    const config = {
      version: 1 as const,
      enabled: true,
      defaultThemeId: 'day',
      selectionMode: 'user' as const,
      themes: [{
        id: 'day',
        name: 'Day',
        assets: {},
        colors: {},
        fallbackHands: { hourColor: '0xFFFFFF', minuteColor: '0xFFFFFF', secondColor: '0xFF0000' },
      }],
    }

    store.previewThemeId = 'old-preview'
    store.hydrate(config)

    expect(store.config).toEqual(config)
    expect(store.config).not.toBe(config)
    expect(store.previewThemeId).toBe('day')
    expect(JSON.stringify(store.config)).not.toContain('previewThemeId')
  })

  it('enables a legacy design by creating one initial theme', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign(design)

    expect(store.config?.enabled).toBe(true)
    expect(store.config?.themes).toHaveLength(1)
    expect(store.config?.themes[0].assets.hourHand).toEqual({
      assetId: 12,
      imageUrl: 'https://cdn.example/hour.svg',
    })
    expect(store.previewThemeId).toBe(store.config?.defaultThemeId)
  })

  it('adds and duplicates themes with fresh stable ids and copied values', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign(design)

    const added = store.addTheme('Night', ids('night-id'))
    store.updateColor(added.id, 'accent', '0x112233')
    const duplicate = store.duplicateTheme(added.id, ids('night-copy-id'))

    expect(added.id).toBe('night-id')
    expect(duplicate.id).toBe('night-copy-id')
    expect(duplicate.name).toBe('Night copy')
    expect(duplicate.colors).toEqual({ accent: '0x112233' })
    expect(duplicate.colors).not.toBe(added.colors)
  })

  it('renames, reorders, and rejects conflicting names', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign(design)
    const night = store.addTheme('Night', ids('night'))
    const sport = store.addTheme('Sport', ids('sport'))

    store.renameTheme(night.id, 'Evening')
    store.moveTheme(sport.id, 0)

    expect(store.config?.themes.map((theme) => theme.name)).toEqual(['Sport', 'Default', 'Evening'])
    expect(() => store.renameTheme(night.id, ' sport ')).toThrow('visualTheme.nameConflict')
    expect(() => store.renameTheme(night.id, '')).toThrow('visualTheme.nameRequired')
  })

  it('protects the default theme and updates default independently from preview', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign(design)
    const night = store.addTheme('Night', ids('night'))

    store.setPreviewTheme(night.id)
    expect(store.config?.defaultThemeId).toBe('default')
    expect(store.previewThemeId).toBe('night')
    expect(() => store.removeTheme('default')).toThrow('visualTheme.defaultProtected')

    store.setDefaultTheme(night.id)
    expect(store.config?.defaultThemeId).toBe('night')
    expect(store.previewThemeId).toBe('night')
  })

  it('removes non-default themes and repairs an affected preview', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign(design)
    const night = store.addTheme('Night', ids('night'))
    store.setPreviewTheme(night.id)

    store.removeTheme(night.id)

    expect(store.config?.themes.map((theme) => theme.id)).toEqual(['default'])
    expect(store.previewThemeId).toBe('default')
  })

  it('updates assets, theme colors, and fallback hand colors', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign(design)

    store.updateAsset('default', 'centerCap', {
      assetId: 21,
      imageUrl: 'https://cdn.example/cap.svg',
      targetSize: 18,
    })
    store.updateColor('default', 'accent', '#ABCDEF')
    store.updateFallbackColor('default', 'secondColor', '0x00FF00')

    expect(store.config?.themes[0].assets.centerCap).toEqual({
      assetId: 21,
      imageUrl: 'https://cdn.example/cap.svg',
      targetSize: 18,
    })
    expect(store.config?.themes[0].colors.accent).toBe('0xABCDEF')
    expect(store.config?.themes[0].fallbackHands.secondColor).toBe('0x00FF00')
  })

  it('normalizes color picker hashes before updating theme state', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign(design)

    store.updateColor('default', 'accent', '#a1b2c3')
    store.updateFallbackColor('default', 'hourColor', '#d4e5f6')

    expect(store.config?.themes[0].colors.accent).toBe('0xA1B2C3')
    expect(store.config?.themes[0].fallbackHands.hourColor).toBe('0xD4E5F6')
  })

  it('disables themes while retaining their definitions', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign(design)
    store.addTheme('Night', ids('night'))

    store.disable()

    expect(store.config?.enabled).toBe(false)
    expect(store.config?.themes.map((theme) => theme.name)).toEqual(['Default', 'Night'])
  })
})

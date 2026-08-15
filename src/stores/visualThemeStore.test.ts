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

  it('preserves theme colors and removes legacy fallback hands during hydration', () => {
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
        colors: { Accent: '0x112233' },
        fallbackHands: {
          hourColor: '0xFFFFFF',
          minuteColor: '0xFFFFFF',
          secondColor: '0xFF0000',
        },
      }],
    }

    store.previewThemeId = 'old-preview'
    store.hydrate(config as any)

    expect(store.config?.themes[0]).toEqual({
      id: 'day',
      name: 'Day',
      assets: {},
      colors: { Accent: '0x112233' },
    })
    expect(store.config).not.toBe(config)
    expect(store.previewThemeId).toBe('day')
    expect(JSON.stringify(store.config)).not.toContain('previewThemeId')
    expect(store.config?.themes[0].colors).toEqual({ Accent: '0x112233' })
    expect(store.config?.themes[0]).not.toHaveProperty('fallbackHands')
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

  it('captures the authoritative background when enabling from a filtered design', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign({
      ...design,
      elements: design.elements.filter((element) => element.eleType !== 'background'),
    }, [{
      id: 'background-1',
      eleType: 'background',
      imageId: 41,
      imageUrl: 'https://cdn.example/authoritative-background.png',
    }])

    expect(store.themes[0].assets.background).toEqual({
      assetId: 41,
      imageUrl: 'https://cdn.example/authoritative-background.png',
    })
  })

  it('backfills missing backgrounds during hydration without overwriting existing values', () => {
    const store = useVisualThemeStore()
    store.hydrate({
      version: 1,
      enabled: true,
      defaultThemeId: 'default',
      selectionMode: 'user',
      themes: [
        {
          id: 'default',
          name: 'Default',
          assets: {},
        },
        {
          id: 'night',
          name: 'Night',
          assets: {
            background: { assetId: 99, imageUrl: 'https://cdn.example/night.png' },
          },
        },
      ],
    }, [{
      id: 'background-1',
      eleType: 'background',
      imageId: 41,
      imageUrl: 'https://cdn.example/base.png',
    }])

    expect(store.themes[0].assets.background?.assetId).toBe(41)
    expect(store.themes[1].assets.background?.assetId).toBe(99)
  })

  it('keeps an explicit cleared background instead of deleting the slot', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign(design)

    store.updateAsset('default', 'background', null)

    expect(store.themes[0].assets.background).toEqual({
      assetId: null,
      imageUrl: null,
    })
  })

  it('inherits an independent copy of the default background when adding a theme', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign(design)

    const added = store.addTheme('Night', ids('night'))
    const defaultBackground = store.themes.find((theme) => theme.id === store.config?.defaultThemeId)
      ?.assets.background

    expect(added.assets.background).toEqual(defaultBackground)
    expect(added.assets.background).not.toBe(defaultBackground)
  })

  it('adds and duplicates themes with independent color-value copies', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign(design)

    const added = store.addTheme('Night', ids('night-id'))
    store.updateColor(added.id, 'Accent', '0x112233')
    store.updateAsset(added.id, 'hourHand', {
      assetId: 41,
      imageUrl: 'night-hour.svg',
    })
    const duplicate = store.duplicateTheme(added.id, ids('night-copy-id'))

    expect(added.id).toBe('night-id')
    expect(duplicate.id).toBe('night-copy-id')
    expect(duplicate.name).toBe('Night copy')
    expect(duplicate.assets).toEqual(added.assets)
    expect(duplicate.assets).not.toBe(added.assets)
    expect(duplicate.assets.hourHand).not.toBe(added.assets.hourHand)
    expect(duplicate.colors).toEqual({ Accent: '0x112233' })
    expect(duplicate.colors).not.toBe(added.colors)
  })

  it('allows ten themes and rejects adding or duplicating an eleventh theme', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign(design)

    for (let index = 2; index <= 9; index += 1) {
      store.addTheme(`Theme ${index}`, ids(`theme-${index}`))
    }

    expect(store.addTheme('Theme 10', ids('theme-10')).id).toBe('theme-10')
    expect(() => store.addTheme('Theme 11', ids('theme-11')))
      .toThrow('visualTheme.themeLimit')
    expect(() => store.duplicateTheme(store.themes[0].id, ids('copy-11')))
      .toThrow('visualTheme.themeLimit')
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

  it('updates theme assets', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign(design)

    store.updateAsset('default', 'centerCap', {
      assetId: 21,
      imageUrl: 'https://cdn.example/cap.svg',
      targetSize: 18,
    })
    expect(store.config?.themes[0].assets.centerCap).toEqual({
      assetId: 21,
      imageUrl: 'https://cdn.example/cap.svg',
      targetSize: 18,
    })
  })

  it('clears only the selected theme hand override so it inherits the base hand', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign(design)
    const night = store.addTheme('Night', ids('night'))
    store.updateAsset(night.id, 'hourHand', {
      assetId: 41,
      imageUrl: 'night-hour.svg',
    })

    store.updateAsset(night.id, 'hourHand', null)

    expect(store.themes.find(theme => theme.id === night.id)?.assets).not.toHaveProperty('hourHand')
    expect(store.themes.find(theme => theme.id === store.config?.defaultThemeId)?.assets.hourHand)
      .toEqual({
        assetId: 12,
        imageUrl: 'https://cdn.example/hour.svg',
      })
  })

  it('updates only the selected theme value for a shared color variable', () => {
    const store = useVisualThemeStore()
    const sharedProperties = {
      Accent: { type: 'color' as const, title: 'Accent', value: '0x123456' },
    }
    const elements = [{ id: 'label', eleType: 'text', fillProperty: 'Accent' }]
    store.enableFromDesign(design)
    store.syncColorProperties(sharedProperties)
    const night = store.addTheme('Night', ids('night'))

    store.updateColor(night.id, 'Accent', '#ABCDEF')

    expect(store.themes[0].colors?.Accent).toBe('0x123456')
    expect(store.themes[1].colors?.Accent).toBe('0xABCDEF')
    expect(sharedProperties.Accent.value).toBe('0x123456')
    expect(elements[0].fillProperty).toBe('Accent')
  })

  it('randomizes the complete color set for only the selected theme', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign(design)
    store.syncColorProperties({
      Background: { type: 'color', title: 'Background', value: '0x050505' },
      Text: { type: 'color', title: 'Text', value: '0xF5F5F5' },
    })
    const night = store.addTheme('Night', ids('night'))
    const defaultColors = { ...store.requireTheme('default').colors }

    store.randomizeColors(night.id, () => 0.2)

    expect(store.requireTheme('night').colors).not.toEqual(defaultColors)
    expect(Object.keys(store.requireTheme('night').colors ?? {})).toEqual(['Background', 'Text'])
    expect(store.requireTheme('default').colors).toEqual(defaultColors)
  })

  it('fills only missing theme values from shared variable bindings', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign(design)
    const night = store.addTheme('Night', ids('night'))
    store.updateColor(night.id, 'Accent', '0x654321')

    store.syncColorProperties({
      Accent: { type: 'color', title: 'Accent', value: '0x123456' },
    })

    expect(store.themes[0].colors?.Accent).toBe('0x123456')
    expect(store.themes[1].colors?.Accent).toBe('0x654321')
  })

  it('adds every new color property to every theme without requiring a binding', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign(design)
    store.addTheme('Night', ids('night'))

    store.addColorProperty('Accent', '#123456')

    expect(store.themes.map((theme) => theme.colors?.Accent))
      .toEqual(['0x123456', '0x123456'])
  })

  it('syncs every color property while preserving existing theme values', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign(design)
    const night = store.addTheme('Night', ids('night'))
    store.updateColor(night.id, 'Accent', '#654321')

    store.syncColorProperties({
      Accent: { type: 'color', title: 'Accent', value: '0x123456' },
      Label: { type: 'text', title: 'Label', value: 'Text' },
    })

    expect(store.requireTheme('default').colors?.Accent).toBe('0x123456')
    expect(store.requireTheme('night').colors?.Accent).toBe('0x654321')
    expect(store.requireTheme('night').colors?.Label).toBeUndefined()
  })

  it('removes a deleted color property from every theme', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign(design)
    store.addTheme('Night', ids('night'))
    store.addColorProperty('Accent', '#123456')

    store.removeColorProperty('Accent')

    expect(store.themes.every((theme) => theme.colors?.Accent === undefined)).toBe(true)
  })

  it('resolves the preview theme first and otherwise falls back to the default theme', () => {
    const store = useVisualThemeStore()
    store.enableFromDesign(design)
    store.addTheme('Night', ids('night'))

    expect(store.currentWritableThemeId()).toBe('night')
    store.previewThemeId = null
    expect(store.currentWritableThemeId()).toBe('default')
    store.previewThemeId = 'missing'
    expect(() => store.currentWritableThemeId()).toThrow('visualTheme.themeNotFound')
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

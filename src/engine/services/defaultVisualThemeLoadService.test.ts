import { describe, expect, it } from 'vitest'
import type { RuntimeDesignConfig } from '@/types/app/config'
import { projectDefaultVisualThemeForLoad } from './defaultVisualThemeLoadService'

const createConfig = (): RuntimeDesignConfig => ({
  version: '1.0',
  designId: 'design-1',
  name: 'Multi theme',
  textCase: 0,
  bitmapMode: true,
  properties: {
    accent: {
      type: 'color',
      title: 'Accent',
      value: '0xAAAAAA',
    },
    label: {
      type: 'text',
      title: 'Label',
      value: 'Steps',
    },
  },
  elements: [
    {
      id: 'background',
      eleType: 'background',
      imageUrl: 'base-bg.png',
      imageId: 91,
      assetId: 91,
    },
    {
      id: 'hour',
      eleType: 'hourHand',
      imageUrl: 'base-hour.png',
      assetId: 92,
    },
    {
      id: 'text',
      eleType: 'text',
      color: '#AAAAAA',
      colorProperty: 'accent',
    },
  ] as RuntimeDesignConfig['elements'],
  orderIds: ['background', 'hour', 'text'],
  visualThemes: {
    version: 1,
    enabled: true,
    defaultThemeId: 'day',
    selectionMode: 'user',
    themes: [
      {
        id: 'day',
        name: 'Day',
        assets: {
          background: { assetId: 11, imageUrl: 'default-bg.png' },
          hourHand: { assetId: 12, imageUrl: 'default-hour.png' },
        },
        colors: { accent: '0x112233' },
      },
      {
        id: 'night',
        name: 'Night',
        assets: {
          background: { assetId: 21, imageUrl: 'alternate-bg.png' },
          hourHand: { assetId: 22, imageUrl: 'alternate-hour.png' },
        },
        colors: { accent: '0x445566' },
      },
    ],
  },
})

describe('projectDefaultVisualThemeForLoad', () => {
  it('projects default assets and bound colors without changing the source or other themes', () => {
    const config = createConfig()
    const alternateTheme = structuredClone(config.visualThemes!.themes[1])

    const projected = projectDefaultVisualThemeForLoad(config)

    expect(projected).not.toBe(config)
    expect(projected.elements.find(element => element.eleType === 'background')).toMatchObject({
      imageUrl: 'default-bg.png',
      imageId: null,
      assetId: 11,
    })
    expect(projected.elements.find(element => element.eleType === 'hourHand')).toMatchObject({
      imageUrl: 'default-hour.png',
      assetId: 12,
    })
    expect(projected.properties.accent.value).toBe('0x112233')
    expect(projected.elements.find(element => element.id === 'text')).toMatchObject({
      color: '#112233',
    })
    expect(projected.visualThemes!.themes[1]).toEqual(alternateTheme)
    expect(config.elements.find(element => element.eleType === 'background')).toMatchObject({
      imageUrl: 'base-bg.png',
      imageId: 91,
      assetId: 91,
    })
    expect(config.properties.accent.value).toBe('0xAAAAAA')
  })

  it('keeps base values when the default theme omits assets and colors', () => {
    const config = createConfig()
    config.visualThemes!.themes[0].assets = {}
    config.visualThemes!.themes[0].colors = {}

    const projected = projectDefaultVisualThemeForLoad(config)

    expect(projected.elements).toEqual(config.elements)
    expect(projected.properties).toEqual(config.properties)
  })

  it('returns the original config when visual themes are disabled', () => {
    const config = createConfig()
    config.visualThemes!.enabled = false

    expect(projectDefaultVisualThemeForLoad(config)).toBe(config)
  })

  it('returns the original config when the default theme is missing', () => {
    const config = createConfig()
    config.visualThemes!.defaultThemeId = 'missing'

    expect(projectDefaultVisualThemeForLoad(config)).toBe(config)
  })

  it('ignores a themed asset when its base element does not exist', () => {
    const config = createConfig()
    config.elements = config.elements.filter(element => element.eleType !== 'hourHand')

    const projected = projectDefaultVisualThemeForLoad(config)

    expect(projected.elements.some(element => element.eleType === 'hourHand')).toBe(false)
    expect(projected.visualThemes!.themes[0].assets.hourHand).toEqual({
      assetId: 12,
      imageUrl: 'default-hour.png',
    })
  })
})

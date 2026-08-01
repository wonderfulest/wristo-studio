import { describe, expect, it } from 'vitest'
import type { RuntimeDesignConfig } from '@/types/app/config'
import type { PropertiesMap } from '@/types/properties'
import type { VisualTheme, VisualThemesConfig } from '@/types/visualTheme'
import {
  backfillVisualThemeBackground,
  canEnableThemeOwner,
  createInitialVisualThemes,
  isThemeRuleActive,
  normalizeThemeMode,
  normalizeVisualThemesConfig,
  validateVisualThemes,
} from './visualThemeService'

describe('isThemeRuleActive', () => {
  it.each([
    [{ active: 1 }, true],
    [{ active: true }, true],
    [{ active: 0 }, false],
    [{ active: false }, false],
    [null, false],
  ] as const)('maps the rule activation contract %#', (rule, expected) => {
    expect(isThemeRuleActive(rule)).toBe(expected)
  })

  it('keeps legacy rule objects without an active field enabled', () => {
    expect(isThemeRuleActive({ ruleType: 'SUN' })).toBe(true)
  })
})

describe('canEnableThemeOwner', () => {
  it('blocks visual themes when a dynamic rule already owns theme selection', () => {
    expect(canEnableThemeOwner({
      visualThemesEnabled: false,
      dynamicRuleActive: true,
      requestedOwner: 'visual',
    })).toEqual({
      allowed: false,
      messageKey: 'visualTheme.dynamicRuleConflict',
    })
  })

  it('blocks a dynamic rule when visual themes already own theme selection', () => {
    expect(canEnableThemeOwner({
      visualThemesEnabled: true,
      dynamicRuleActive: false,
      requestedOwner: 'dynamic',
    })).toEqual({
      allowed: false,
      messageKey: 'elementSettings.visualThemeConflict',
    })
  })

  it('allows enabling an owner when the other owner is inactive', () => {
    expect(canEnableThemeOwner({
      visualThemesEnabled: false,
      dynamicRuleActive: false,
      requestedOwner: 'visual',
    })).toEqual({ allowed: true })
    expect(canEnableThemeOwner({
      visualThemesEnabled: false,
      dynamicRuleActive: false,
      requestedOwner: 'dynamic',
    })).toEqual({ allowed: true })
  })
})

const properties: PropertiesMap = {
  PrimaryColor: {
    type: 'color',
    title: 'Primary Color',
    value: '0xFFFFFF',
    themeMode: 'theme',
  },
  CustomDataColor: {
    type: 'color',
    title: 'Custom Data Color',
    value: '0x00FF00',
    themeMode: 'user',
  },
  Label: {
    type: 'text',
    title: 'Label',
    value: 'Steps',
  },
}

const createTheme = (overrides: Partial<VisualTheme> = {}): VisualTheme => ({
  id: 'classic',
  name: 'Classic',
  assets: {
    hourHand: { assetId: 101, imageUrl: 'https://assets.example/hour.svg' },
    minuteHand: { assetId: 102, imageUrl: 'https://assets.example/minute.svg' },
  },
  colors: {},
  ...overrides,
})

const createConfig = (themes: VisualTheme[]): VisualThemesConfig => ({
  version: 1,
  enabled: true,
  defaultThemeId: themes[0]?.id ?? 'classic',
  selectionMode: 'user',
  themes,
})

describe('normalizeVisualThemesConfig', () => {
  it('preserves theme colors and drops legacy fallback hands', () => {
    const legacy = {
      version: 1 as const,
      enabled: true,
      defaultThemeId: 'day',
      selectionMode: 'user' as const,
      themes: [{
        id: 'day',
        name: 'Day',
        assets: {
          background: { assetId: 11, imageUrl: 'day.png' },
        },
        colors: { Accent: '0xFF0000' },
        fallbackHands: {
          hourColor: '0xFFFFFF',
          minuteColor: '0xFFFFFF',
          secondColor: '0xFF0000',
        },
      }],
    }

    expect(normalizeVisualThemesConfig(legacy)).toEqual({
      version: 1,
      enabled: true,
      defaultThemeId: 'day',
      selectionMode: 'user',
      themes: [{
        id: 'day',
        name: 'Day',
        assets: {
          background: { assetId: 11, imageUrl: 'day.png' },
        },
        colors: { Accent: '0xFF0000' },
      }],
    })
  })

  it('returns a detached copy for current configs', () => {
    const config = createConfig([createTheme()])
    const normalized = normalizeVisualThemesConfig(config)

    expect(normalized).toEqual(config)
    expect(normalized).not.toBe(config)
    expect(normalized.themes[0]).not.toBe(config.themes[0])
    expect(normalized.themes[0].assets).not.toBe(config.themes[0].assets)
  })
})

describe('normalizeThemeMode', () => {
  it('normalizes a missing legacy mode to user', () => {
    expect(normalizeThemeMode(undefined)).toBe('user')
  })

  it('keeps only the supported theme mode', () => {
    expect(normalizeThemeMode('theme')).toBe('theme')
    expect(normalizeThemeMode('automatic')).toBe('user')
  })
})

describe('createInitialVisualThemes', () => {
  it('deterministically copies current base visual assets into the default theme', () => {
    const config = {
      version: '1.0',
      properties,
      designId: 'design-1',
      name: 'Analog',
      textCase: 0,
      bitmapMode: false,
      elements: [
        { id: 'bg', eleType: 'background', imageId: 100, imageUrl: 'https://assets.example/bg.svg' },
        { id: 'hour', eleType: 'hourHand', assetId: 101, imageUrl: 'https://assets.example/hour.svg' },
        { id: 'minute', eleType: 'minuteHand', assetId: 102, imageUrl: 'https://assets.example/minute.svg' },
        { id: 'second', eleType: 'secondHand', assetId: 103, imageUrl: 'https://assets.example/second.svg' },
        {
          id: 'cap',
          eleType: 'centerCap',
          assetId: 104,
          imageUrl: 'https://assets.example/cap.svg',
          targetSize: 24,
        },
      ],
      orderIds: [],
    } as unknown as RuntimeDesignConfig

    expect(createInitialVisualThemes(config)).toEqual({
      version: 1,
      enabled: true,
      defaultThemeId: 'default',
      selectionMode: 'user',
      themes: [
        {
          id: 'default',
          name: 'Default',
          assets: {
            background: { assetId: 100, imageUrl: 'https://assets.example/bg.svg' },
            hourHand: { assetId: 101, imageUrl: 'https://assets.example/hour.svg' },
            minuteHand: { assetId: 102, imageUrl: 'https://assets.example/minute.svg' },
            secondHand: { assetId: 103, imageUrl: 'https://assets.example/second.svg' },
            centerCap: {
              assetId: 104,
              imageUrl: 'https://assets.example/cap.svg',
              targetSize: 24,
            },
          },
          colors: {},
        },
      ],
    })
  })

  it('captures the unique background independently from filtered runtime elements', () => {
    const config = {
      version: '1.0',
      properties: {},
      designId: 'design-1',
      name: 'Filtered',
      textCase: 0,
      bitmapMode: false,
      elements: [],
      orderIds: [],
    } as unknown as RuntimeDesignConfig

    const result = createInitialVisualThemes(config, [{
      id: 'background-1',
      eleType: 'background',
      imageId: 41,
      imageUrl: 'https://cdn.example/background.png',
    }])

    expect(result.themes[0].assets.background).toEqual({
      assetId: 41,
      imageUrl: 'https://cdn.example/background.png',
    })
  })

  it('never treats an ordinary image as the visual theme background', () => {
    const config = {
      version: '1.0',
      properties: {},
      designId: 'design-1',
      name: 'Image only',
      textCase: 0,
      bitmapMode: false,
      elements: [],
      orderIds: [],
    } as unknown as RuntimeDesignConfig

    const result = createInitialVisualThemes(config, [{
      id: 'image-1',
      eleType: 'image',
      assetId: 52,
      imageUrl: 'https://cdn.example/decor.png',
    }])

    expect(result.themes[0].assets.background).toBeUndefined()
  })
})

describe('backfillVisualThemeBackground', () => {
  it('fills only missing background slots in existing themes', () => {
    const config = createConfig([
      createTheme({ id: 'default', name: 'Default', assets: {} }),
      createTheme({
        id: 'night',
        name: 'Night',
        assets: {
          background: { assetId: 99, imageUrl: 'https://cdn.example/night.png' },
        },
      }),
    ])
    config.defaultThemeId = 'default'

    const migrated = backfillVisualThemeBackground(config, [{
      id: 'background-1',
      eleType: 'background',
      imageId: 41,
      imageUrl: 'https://cdn.example/base.png',
    }])

    expect(migrated.themes[0].assets.background).toEqual({
      assetId: 41,
      imageUrl: 'https://cdn.example/base.png',
    })
    expect(migrated.themes[1].assets.background).toEqual({
      assetId: 99,
      imageUrl: 'https://cdn.example/night.png',
    })
    expect(config.themes[0].assets.background).toBeUndefined()
  })
})

describe('validateVisualThemes', () => {
  it('allows a background override when the implicit default background is filtered from elements', () => {
    const config = createConfig([createTheme({
      assets: {
        background: { assetId: 100, imageUrl: 'https://assets.example/background.png' },
        hourHand: { assetId: 101, imageUrl: 'https://assets.example/hour.svg' },
        minuteHand: { assetId: 102, imageUrl: 'https://assets.example/minute.svg' },
      },
    })])
    const baseElements = [
      { eleType: 'hourHand', assetId: 101, imageUrl: 'https://assets.example/hour.svg' },
      { eleType: 'minuteHand', assetId: 102, imageUrl: 'https://assets.example/minute.svg' },
    ]

    expect(validateVisualThemes(config, baseElements)).not.toContain(
      'Theme "Classic" cannot override background because the base element does not exist.',
    )
  })

  it('requires the version-1 user-selection schema', () => {
    const invalid = createConfig([createTheme()])
    ;(invalid as { version: number }).version = 2
    ;(invalid as { selectionMode: string }).selectionMode = 'automatic'
    ;(invalid as { enabled: unknown }).enabled = 'true'
    expect(validateVisualThemes(invalid)).toEqual(
      expect.arrayContaining([
        'Visual themes version must be 1.',
        'Visual themes selectionMode must be "user".',
        'Visual themes enabled must be a boolean.',
      ]),
    )
  })

  it('accepts one through ten valid themes', () => {
    expect(validateVisualThemes(createConfig([createTheme()]))).toEqual([])
    const tenThemes = Array.from({ length: 10 }, (_, index) =>
      createTheme({ id: `theme-${index}`, name: `Theme ${index}` }),
    )
    expect(validateVisualThemes(createConfig(tenThemes))).toEqual([])
  })

  it('rejects zero or more than ten themes', () => {
    expect(validateVisualThemes(createConfig([]))).toContain(
      'Visual themes must contain between 1 and 10 themes.',
    )
    const elevenThemes = Array.from({ length: 11 }, (_, index) =>
      createTheme({ id: `theme-${index}`, name: `Theme ${index}` }),
    )
    expect(validateVisualThemes(createConfig(elevenThemes))).toContain(
      'Visual themes must contain between 1 and 10 themes.',
    )
  })

  it('requires non-empty unique stable IDs', () => {
    const duplicateIds = createConfig([
      createTheme(),
      createTheme({ id: 'classic', name: 'Modern' }),
      createTheme({ id: '', name: 'Empty ID' }),
    ])
    expect(validateVisualThemes(duplicateIds)).toEqual(
      expect.arrayContaining([
        'Theme IDs must be non-empty.',
        'Theme IDs must be unique.',
      ]),
    )
  })

  it('requires non-empty unique names no longer than 24 characters', () => {
    const invalidNames = createConfig([
      createTheme(),
      createTheme({ id: 'modern', name: 'classic' }),
      createTheme({ id: 'empty-name', name: ' ' }),
      createTheme({ id: 'long-name', name: 'A theme name over 24 chars' }),
    ])
    expect(validateVisualThemes(invalidNames)).toEqual(
      expect.arrayContaining([
        'Theme names must be non-empty and at most 24 characters.',
        'Theme names must be unique.',
      ]),
    )
  })

  it('requires the default theme to exist', () => {
    const config = createConfig([createTheme()])
    config.defaultThemeId = 'missing'
    expect(validateVisualThemes(config)).toContain(
      'Default theme "missing" does not exist.',
    )
  })

  it('accepts enabled visual themes without hand elements or hand overrides', () => {
    expect(validateVisualThemes(
      createConfig([createTheme({ assets: {} })]),
      [],
    )).toEqual([])
  })

  it('uses base hand assets when a theme does not override them', () => {
    expect(validateVisualThemes(
      createConfig([createTheme({ assets: {} })]),
      [
        { eleType: 'hourHand', assetId: 11, imageUrl: 'hour.svg' },
        { eleType: 'minuteHand', assetId: 12, imageUrl: 'minute.svg' },
      ],
    )).toEqual([])
  })

  it('still rejects a hand override whose base element does not exist', () => {
    expect(validateVisualThemes(
      createConfig([createTheme({
        assets: { hourHand: { assetId: 11, imageUrl: 'hour.svg' } },
      })]),
      [],
    )).toContain(
      'Theme "Classic" cannot override hourHand because the base element does not exist.',
    )
  })

  it('rejects overrides for optional slots that have no base draw layer', () => {
    const theme = createTheme({
      assets: {
        hourHand: { assetId: 101, imageUrl: 'hour.svg' },
        minuteHand: { assetId: 102, imageUrl: 'minute.svg' },
        secondHand: { assetId: 103, imageUrl: 'second.svg' },
      },
    })
    expect(validateVisualThemes(
      createConfig([theme]),
      [
        { eleType: 'hourHand', assetId: 1, imageUrl: 'base-hour.svg' },
        { eleType: 'minuteHand', assetId: 2, imageUrl: 'base-minute.svg' },
      ],
    )).toContain('Theme "Classic" cannot override secondHand because the base element does not exist.')
  })

  it('does not require packaging-only hand assets while visual themes are disabled', () => {
    const config = createConfig([createTheme({ assets: {} })])
    config.enabled = false
    expect(validateVisualThemes(config)).toEqual([])
  })

  it.each([0, -1, 1.5])('rejects invalid persistent assetId %s', (assetId) => {
    const theme = createTheme({
      assets: {
        hourHand: { assetId, imageUrl: 'https://assets.example/hour.svg' },
        minuteHand: { assetId: 102, imageUrl: 'https://assets.example/minute.svg' },
      },
    })
    expect(validateVisualThemes(createConfig([theme]))).toContain(
      'Theme "Classic" hourHand assetId must be a positive integer.',
    )
  })

  it('rejects browser blob URLs without persistent asset IDs', () => {
    const theme = createTheme({
      assets: {
        hourHand: { assetId: null, imageUrl: 'blob:https://studio.example/hour' },
        minuteHand: { assetId: 102, imageUrl: 'blob:https://studio.example/minute' },
      },
    })
    expect(validateVisualThemes(createConfig([theme]))).toContain(
      'Theme "Classic" hourHand requires a persistent assetId.',
    )
    expect(validateVisualThemes(createConfig([theme]))).not.toContain(
      'Theme "Classic" minuteHand requires a persistent assetId.',
    )
  })

  it.each([0, -1, 1.5])('requires a positive integer centerCap targetSize when present: %s', (targetSize) => {
    const theme = createTheme({
      assets: {
        hourHand: { assetId: 101, imageUrl: 'https://assets.example/hour.svg' },
        minuteHand: { assetId: 102, imageUrl: 'https://assets.example/minute.svg' },
        centerCap: {
          assetId: 104,
          imageUrl: 'https://assets.example/cap.svg',
          targetSize,
        },
      },
    })
    expect(validateVisualThemes(createConfig([theme]))).toContain(
      'Theme "Classic" centerCap targetSize must be a positive integer.',
    )
  })

  it('validates theme values against the shared color-variable definitions', () => {
    const theme = createTheme({
      colors: {
        PrimaryColor: 'red',
        Label: '0xFFFFFF',
        MissingColor: '0xFFFFFF',
      },
    })

    expect(validateVisualThemes(createConfig([theme]), properties)).toEqual(
      expect.arrayContaining([
        'Theme "Classic" color "PrimaryColor" must be an RGB565-compatible color.',
        'Theme "Classic" color property "Label" must exist and have type color.',
        'Theme "Classic" color property "MissingColor" must exist and have type color.',
      ]),
    )
  })

})

describe('resolveThemeColor', () => {
  it('uses the current theme value for the shared variable key', async () => {
    const { resolveThemeColor } = await import('./visualThemeService')
    const day = createTheme({ colors: { PrimaryColor: '0xFFFFFF' } })
    const night = createTheme({ colors: { PrimaryColor: '0x000000' } })

    expect(resolveThemeColor('PrimaryColor', day, properties)).toBe('0xFFFFFF')
    expect(resolveThemeColor('PrimaryColor', night, properties)).toBe('0x000000')
    expect(properties.PrimaryColor.value).toBe('0xFFFFFF')
  })
})

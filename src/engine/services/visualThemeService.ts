import type { RuntimeDesignConfig } from '@/types/app/config'
import type { PropertiesMap } from '@/types/properties'
import type {
  ThemeMode,
  VisualTheme,
  VisualThemeAssetRef,
  VisualThemeAssetSlot,
  VisualThemesConfig,
} from '@/types/visualTheme'

const ASSET_SLOTS: VisualThemeAssetSlot[] = [
  'background',
  'hourHand',
  'minuteHand',
  'secondHand',
  'centerCap',
]

const REQUIRED_ASSET_SLOTS: VisualThemeAssetSlot[] = ['hourHand', 'minuteHand']

const FALLBACK_COLOR_KEYS = ['hourColor', 'minuteColor', 'secondColor'] as const

const RGB565_COLOR_PATTERN = /^(?:#|0x)[0-9a-f]{6}$/i

export type ThemeOwner = 'visual' | 'dynamic'

export interface ThemeOwnerRequest {
  visualThemesEnabled: boolean
  dynamicRuleActive: boolean
  requestedOwner: ThemeOwner
}

export type ThemeOwnerDecision =
  | { allowed: true }
  | { allowed: false; messageKey: string }

export function canEnableThemeOwner(request: ThemeOwnerRequest): ThemeOwnerDecision {
  if (request.requestedOwner === 'visual' && request.dynamicRuleActive) {
    return { allowed: false, messageKey: 'visualTheme.dynamicRuleConflict' }
  }
  if (request.requestedOwner === 'dynamic' && request.visualThemesEnabled) {
    return { allowed: false, messageKey: 'elementSettings.visualThemeConflict' }
  }
  return { allowed: true }
}

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0

export function normalizeThemeMode(mode: unknown): ThemeMode {
  return mode === 'theme' ? 'theme' : 'user'
}

function readAssetRef(element: unknown, slot: VisualThemeAssetSlot): VisualThemeAssetRef {
  const candidate = element as Record<string, unknown>
  const rawAssetId = slot === 'background'
    ? candidate.imageId ?? candidate.assetId
    : candidate.assetId
  const assetId = isPositiveInteger(rawAssetId) ? rawAssetId : null
  const imageUrl = typeof candidate.imageUrl === 'string' && candidate.imageUrl.trim()
    ? candidate.imageUrl
    : null
  const ref: VisualThemeAssetRef = { assetId, imageUrl }
  if (slot === 'centerCap' && isPositiveInteger(candidate.targetSize)) {
    ref.targetSize = candidate.targetSize
  }
  return ref
}

export function createInitialVisualThemes(config: RuntimeDesignConfig): VisualThemesConfig {
  const assets: VisualTheme['assets'] = {}

  for (const slot of ASSET_SLOTS) {
    const element = config.elements.find((candidate) => candidate.eleType === slot)
    if (element) assets[slot] = readAssetRef(element, slot)
  }

  return {
    version: 1,
    enabled: true,
    defaultThemeId: 'default',
    selectionMode: 'user',
    themes: [
      {
        id: 'default',
        name: 'Default',
        assets,
        colors: {},
        fallbackHands: {
          hourColor: '0xFFFFFF',
          minuteColor: '0xFFFFFF',
          secondColor: '0xFF0000',
        },
      },
    ],
  }
}

function hasAssetSource(asset: VisualThemeAssetRef | undefined): boolean {
  return Boolean(
    asset
    && (
      isPositiveInteger(asset.assetId)
      || (typeof asset.imageUrl === 'string' && asset.imageUrl.trim())
    ),
  )
}

function isRgb565Color(value: unknown): boolean {
  return typeof value === 'string' && RGB565_COLOR_PATTERN.test(value.trim())
}

export function validateVisualThemes(
  visualThemes: VisualThemesConfig | undefined,
  properties: PropertiesMap,
): string[] {
  if (!visualThemes) return []

  const errors: string[] = []
  const themes = visualThemes.themes

  if (visualThemes.version !== 1) {
    errors.push('Visual themes version must be 1.')
  }
  if (visualThemes.selectionMode !== 'user') {
    errors.push('Visual themes selectionMode must be "user".')
  }
  if (typeof visualThemes.enabled !== 'boolean') {
    errors.push('Visual themes enabled must be a boolean.')
  }

  if (themes.length < 1 || themes.length > 5) {
    errors.push('Visual themes must contain between 1 and 5 themes.')
  }

  const ids = themes.map((theme) => theme.id.trim())
  if (ids.some((id) => !id)) {
    errors.push('Theme IDs must be non-empty.')
  }
  if (new Set(ids.filter(Boolean)).size !== ids.filter(Boolean).length) {
    errors.push('Theme IDs must be unique.')
  }

  const names = themes.map((theme) => theme.name.trim())
  if (names.some((name) => !name || name.length > 24)) {
    errors.push('Theme names must be non-empty and at most 24 characters.')
  }
  const normalizedNames = names.filter(Boolean).map((name) => name.toLocaleLowerCase())
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    errors.push('Theme names must be unique.')
  }

  if (!themes.some((theme) => theme.id === visualThemes.defaultThemeId)) {
    errors.push(`Default theme "${visualThemes.defaultThemeId}" does not exist.`)
  }

  for (const theme of themes) {
    const themeName = theme.name.trim() || theme.id.trim() || 'Unnamed'

    if (visualThemes.enabled === true) {
      for (const slot of REQUIRED_ASSET_SLOTS) {
        if (!hasAssetSource(theme.assets[slot])) {
          errors.push(`Theme "${themeName}" requires a ${slot} asset.`)
        }
      }
    }

    for (const slot of ASSET_SLOTS) {
      const asset = theme.assets[slot]
      if (asset?.assetId !== null && asset?.assetId !== undefined && !isPositiveInteger(asset.assetId)) {
        errors.push(`Theme "${themeName}" ${slot} assetId must be a positive integer.`)
      }
      if (
        asset?.imageUrl?.trim().toLocaleLowerCase().startsWith('blob:')
        && !isPositiveInteger(asset.assetId)
      ) {
        errors.push(`Theme "${themeName}" ${slot} requires a persistent assetId.`)
      }
      if (
        slot === 'centerCap'
        && asset?.targetSize !== undefined
        && !isPositiveInteger(asset.targetSize)
      ) {
        errors.push(`Theme "${themeName}" centerCap targetSize must be a positive integer.`)
      }
    }

    for (const [propertyKey, color] of Object.entries(theme.colors)) {
      const property = properties[propertyKey]
      if (!property || property.type !== 'color') {
        errors.push(`Theme "${themeName}" color property "${propertyKey}" must exist and have type color.`)
      } else if (normalizeThemeMode(property.themeMode) !== 'theme') {
        errors.push(`Theme "${themeName}" cannot override user-managed color property "${propertyKey}".`)
      }
      if (!isRgb565Color(color)) {
        errors.push(`Theme "${themeName}" color "${propertyKey}" must be an RGB565-compatible color.`)
      }
    }

    for (const key of FALLBACK_COLOR_KEYS) {
      if (!isRgb565Color(theme.fallbackHands[key])) {
        errors.push(`Theme "${themeName}" fallback ${key} must be an RGB565-compatible color.`)
      }
    }
  }

  return errors
}

export function resolveThemeColor(
  propertyKey: string,
  theme: VisualTheme,
  properties: PropertiesMap,
): string | undefined {
  const property = properties[propertyKey]
  if (!property || property.type !== 'color') return undefined
  if (normalizeThemeMode(property.themeMode) === 'theme' && theme.colors[propertyKey] !== undefined) {
    return theme.colors[propertyKey]
  }
  return typeof property.value === 'string' ? property.value : undefined
}

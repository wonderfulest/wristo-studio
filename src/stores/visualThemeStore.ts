import { defineStore } from 'pinia'
import { createInitialVisualThemes } from '@/engine/services/visualThemeService'
import type { RuntimeDesignConfig } from '@/types/app/config'
import type {
  VisualTheme,
  VisualThemeAssetRef,
  VisualThemeAssetSlot,
  VisualThemesConfig,
} from '@/types/visualTheme'

export type VisualThemeIdFactory = () => string
export type VisualThemeFallbackColor = keyof VisualTheme['fallbackHands']

const createId: VisualThemeIdFactory = () => crypto.randomUUID()
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const toMonkeyColor = (color: string): string => {
  const normalized = color.trim()
  return /^(?:#|0x)[0-9a-f]{6}$/i.test(normalized)
    ? `0x${normalized.slice(-6).toUpperCase()}`
    : color
}

const emptyTheme = (id: string, name: string): VisualTheme => ({
  id,
  name,
  assets: {},
  colors: {},
  fallbackHands: {
    hourColor: '0xFFFFFF',
    minuteColor: '0xFFFFFF',
    secondColor: '0xFF0000',
  },
})

export const useVisualThemeStore = defineStore('visualTheme', {
  state: () => ({
    config: undefined as VisualThemesConfig | undefined,
    previewThemeId: null as string | null,
  }),

  getters: {
    themes: (state): VisualTheme[] => state.config?.themes ?? [],
    previewTheme: (state): VisualTheme | undefined =>
      state.config?.themes.find((theme) => theme.id === state.previewThemeId),
  },

  actions: {
    hydrate(config: VisualThemesConfig | undefined): void {
      this.config = config ? clone(config) : undefined
      this.previewThemeId = this.config?.defaultThemeId ?? null
    },

    enableFromDesign(config: RuntimeDesignConfig): void {
      if (!this.config) {
        this.config = createInitialVisualThemes(config)
      } else {
        this.config.enabled = true
      }
      this.previewThemeId = this.config.defaultThemeId
    },

    disable(): void {
      if (this.config) this.config.enabled = false
    },

    addTheme(name?: string, idFactory: VisualThemeIdFactory = createId): VisualTheme {
      const config = this.requireConfig()
      if (config.themes.length >= 5) throw new Error('visualTheme.themeLimit')
      const resolvedName = name?.trim() || this.nextThemeName()
      this.assertName(resolvedName)
      const theme = emptyTheme(idFactory(), resolvedName)
      config.themes.push(theme)
      this.previewThemeId = theme.id
      return theme
    },

    duplicateTheme(themeId: string, idFactory: VisualThemeIdFactory = createId): VisualTheme {
      const config = this.requireConfig()
      if (config.themes.length >= 5) throw new Error('visualTheme.themeLimit')
      const source = this.requireTheme(themeId)
      const name = this.nextCopyName(source.name)
      const duplicate = clone(source)
      duplicate.id = idFactory()
      duplicate.name = name
      config.themes.push(duplicate)
      this.previewThemeId = duplicate.id
      return duplicate
    },

    renameTheme(themeId: string, name: string): void {
      const theme = this.requireTheme(themeId)
      const normalized = name.trim()
      this.assertName(normalized, themeId)
      theme.name = normalized
    },

    removeTheme(themeId: string): void {
      const config = this.requireConfig()
      if (config.defaultThemeId === themeId) throw new Error('visualTheme.defaultProtected')
      const index = config.themes.findIndex((theme) => theme.id === themeId)
      if (index < 0) throw new Error('visualTheme.themeNotFound')
      config.themes.splice(index, 1)
      if (this.previewThemeId === themeId) this.previewThemeId = config.defaultThemeId
    },

    moveTheme(themeId: string, targetIndex: number): void {
      const config = this.requireConfig()
      const currentIndex = config.themes.findIndex((theme) => theme.id === themeId)
      if (currentIndex < 0) throw new Error('visualTheme.themeNotFound')
      const [theme] = config.themes.splice(currentIndex, 1)
      const boundedIndex = Math.max(0, Math.min(targetIndex, config.themes.length))
      config.themes.splice(boundedIndex, 0, theme)
    },

    setDefaultTheme(themeId: string): void {
      this.requireTheme(themeId)
      this.requireConfig().defaultThemeId = themeId
    },

    setPreviewTheme(themeId: string | null): void {
      if (themeId !== null) this.requireTheme(themeId)
      this.previewThemeId = themeId
    },

    updateAsset(themeId: string, slot: VisualThemeAssetSlot, asset: VisualThemeAssetRef | null): void {
      const theme = this.requireTheme(themeId)
      if (asset) theme.assets[slot] = clone(asset)
      else delete theme.assets[slot]
    },

    updateColor(themeId: string, propertyKey: string, color: string): void {
      this.requireTheme(themeId).colors[propertyKey] = toMonkeyColor(color)
    },

    updateFallbackColor(themeId: string, key: VisualThemeFallbackColor, color: string): void {
      this.requireTheme(themeId).fallbackHands[key] = toMonkeyColor(color)
    },

    requireConfig(): VisualThemesConfig {
      if (!this.config) throw new Error('visualTheme.notInitialized')
      return this.config
    },

    requireTheme(themeId: string): VisualTheme {
      const theme = this.requireConfig().themes.find((candidate) => candidate.id === themeId)
      if (!theme) throw new Error('visualTheme.themeNotFound')
      return theme
    },

    assertName(name: string, excludedId?: string): void {
      if (!name) throw new Error('visualTheme.nameRequired')
      if (name.length > 24) throw new Error('visualTheme.nameTooLong')
      const conflict = this.themes.some((theme) =>
        theme.id !== excludedId && theme.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())
      if (conflict) throw new Error('visualTheme.nameConflict')
    },

    nextThemeName(): string {
      let index = this.themes.length + 1
      while (this.themes.some((theme) => theme.name.toLocaleLowerCase() === `theme ${index}`)) index += 1
      return `Theme ${index}`
    },

    nextCopyName(name: string): string {
      const base = `${name} copy`
      if (!this.themes.some((theme) => theme.name.toLocaleLowerCase() === base.toLocaleLowerCase())) return base
      let index = 2
      while (this.themes.some((theme) => theme.name.toLocaleLowerCase() === `${base} ${index}`.toLocaleLowerCase())) index += 1
      return `${base} ${index}`
    },
  },
})

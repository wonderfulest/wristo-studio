import { defineStore } from 'pinia'
import type {
  FontRoleBindings,
  LocaleFontBinding,
  WatchfaceLocale,
  WatchfaceLocalizationConfig,
} from '@/types/localization'

export type WatchShape = 'circle' | 'rectangle'

export interface DesignSpec {
  width: number
  height: number
  shape: WatchShape
}

export const useDesignStore = defineStore('design', {
  state: () => ({
    id: '' as string,
    watchFaceName: '' as string,
    watchSize: 454,
    designSpec: {
      width: 454,
      height: 454,
      centerX: 227,
      centerY: 227,
      shape: 'circle' as WatchShape,
    } as DesignSpec & { centerX: number; centerY: number },
    defaultLocale: 'en-US' as WatchfaceLocale,
    supportedLocales: ['en-US'] as WatchfaceLocale[],
    supportsChineseContent: false,
    fontRoles: {} as Record<string, FontRoleBindings>,
  }),

  actions: {
    setWatchFaceName(name: string): void {
      this.watchFaceName = name
    },

    setDesignSize(width: number, height = width): void {
      const nextWidth = Math.max(64, Math.round(width))
      const nextHeight = Math.max(64, Math.round(height))

      this.watchSize = nextWidth
      this.designSpec.width = nextWidth
      this.designSpec.height = nextHeight
      this.designSpec.centerX = Math.round(nextWidth / 2)
      this.designSpec.centerY = Math.round(nextHeight / 2)
    },

    setSupportedLocales(locales: WatchfaceLocale[]): void {
      const uniqueLocales = Array.from(new Set(locales))
      this.supportedLocales = uniqueLocales.length ? uniqueLocales : ['en-US']
      if (!this.supportedLocales.includes(this.defaultLocale)) {
        this.defaultLocale = this.supportedLocales[0]
      }
    },

    setDefaultLocale(locale: WatchfaceLocale): void {
      this.defaultLocale = locale
      if (!this.supportedLocales.includes(locale)) {
        this.supportedLocales = [locale, ...this.supportedLocales]
      }
    },

    setSupportsChineseContent(value: boolean): void {
      this.supportsChineseContent = Boolean(value)
    },

    setLocaleFontRole(role: string, locale: WatchfaceLocale, binding: LocaleFontBinding): void {
      if (!this.fontRoles[role]) {
        this.fontRoles[role] = {}
      }
      this.fontRoles[role][locale] = binding
    },

    getLocalizationConfig(): WatchfaceLocalizationConfig | undefined {
      if (!this.supportedLocales.length || !Object.keys(this.fontRoles).length) return undefined
      return {
        defaultLocale: this.defaultLocale,
        supportedLocales: [...this.supportedLocales],
        fontRoles: this.fontRoles,
      }
    },

  },
})

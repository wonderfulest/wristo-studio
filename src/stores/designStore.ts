import { defineStore } from 'pinia'
import type { WatchfaceLocale, WatchfaceLocalizationConfig } from '@/types/localization'

export type WatchShape = 'circle' | 'rectangle'

export interface DesignSpec {
  width: number
  height: number
  shape: WatchShape
}

function normalizeConnectIqDataTypeValue(value: unknown): number | null {
  const numericValue = typeof value === 'string' && /^\d+$/.test(value)
    ? Number(value)
    : value
  return typeof numericValue === 'number'
    && Number.isFinite(numericValue)
    && Number.isSafeInteger(numericValue)
    && numericValue >= 0
    ? numericValue
    : null
}

export function normalizeConnectIqSettingsExcludedDataTypeValues(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  const normalized = value
    .map(normalizeConnectIqDataTypeValue)
    .filter((item): item is number => item !== null)
  return Array.from(new Set(normalized)).sort((left, right) => left - right)
}

function hasSameNumericValues(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
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
    connectIqSettingsExcludedDataTypeValues: [] as number[],
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

    setConnectIqSettingsExcludedDataTypeValues(value: unknown): boolean {
      const normalized = normalizeConnectIqSettingsExcludedDataTypeValues(value)
      if (hasSameNumericValues(this.connectIqSettingsExcludedDataTypeValues, normalized)) return false
      this.connectIqSettingsExcludedDataTypeValues = normalized
      return true
    },

    setConnectIqDataTypeSelected(value: unknown, selected: boolean): boolean {
      const normalizedValue = normalizeConnectIqDataTypeValue(value)
      if (normalizedValue === null) return false
      const exclusions = new Set(this.connectIqSettingsExcludedDataTypeValues)
      if (selected) exclusions.delete(normalizedValue)
      else exclusions.add(normalizedValue)
      const normalized = Array.from(exclusions).sort((left, right) => left - right)
      if (hasSameNumericValues(this.connectIqSettingsExcludedDataTypeValues, normalized)) return false
      this.connectIqSettingsExcludedDataTypeValues = normalized
      return true
    },

    getLocalizationConfig(): WatchfaceLocalizationConfig | undefined {
      return {
        defaultLocale: this.defaultLocale,
        supportedLocales: [...this.supportedLocales],
      }
    },

  },
})

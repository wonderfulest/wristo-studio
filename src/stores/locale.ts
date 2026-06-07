import { defineStore } from 'pinia'

export const SUPPORTED_LOCALES = ['en', 'zh'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

export const DEFAULT_LOCALE: SupportedLocale = 'en'

export function normalizeLocale(value: unknown): SupportedLocale {
  const locale = String(value || '').toLowerCase()
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale)
    ? (locale as SupportedLocale)
    : DEFAULT_LOCALE
}

export const useLocaleStore = defineStore('studio-locale', {
  state: () => ({
    currentLocale: DEFAULT_LOCALE as SupportedLocale,
  }),
  actions: {
    setLocale(locale: string) {
      this.currentLocale = normalizeLocale(locale)
      this.syncDocumentLang()
    },
    syncDocumentLang() {
      if (typeof document !== 'undefined') {
        document.documentElement.lang = this.currentLocale === 'zh' ? 'zh-CN' : 'en'
      }
    },
  },
  persist: {
    key: 'wristo-studio-locale',
    storage: localStorage,
  },
})

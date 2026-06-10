import { defineStore } from 'pinia'

export const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ja', 'ko', 'zh', 'zh-tw'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

export const DEFAULT_LOCALE: SupportedLocale = 'en'

const DOCUMENT_LANG_BY_LOCALE: Record<SupportedLocale, string> = {
  en: 'en',
  zh: 'zh-CN',
  'zh-tw': 'zh-TW',
  ja: 'ja',
  ko: 'ko',
  de: 'de',
  fr: 'fr',
  es: 'es',
  it: 'it',
  pt: 'pt',
  nl: 'nl',
  pl: 'pl',
}

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
        document.documentElement.lang = DOCUMENT_LANG_BY_LOCALE[this.currentLocale]
      }
    },
  },
  persist: {
    key: 'wristo-studio-locale',
    storage: localStorage,
  },
})

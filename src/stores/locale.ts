import { defineStore } from 'pinia'

const TRANSLATED_LOCALES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ja', 'ko', 'zh', 'zh-tw'] as const
export type SupportedLocale = typeof TRANSLATED_LOCALES[number]

export const SUPPORTED_LOCALES = ['en', 'zh'] as const satisfies readonly SupportedLocale[]

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
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale)
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

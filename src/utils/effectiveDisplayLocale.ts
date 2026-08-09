export interface EffectiveDisplayLocaleInput {
  locale: string
  nonLatinLanguageSupport: boolean
  useSystemFont?: boolean
}

const NON_LATIN_LOCALES = new Set(['zh', 'zh-cn', 'zh-tw', 'ja', 'ja-jp', 'jpn'])

export function isNonLatinLocale(locale: string): boolean {
  return NON_LATIN_LOCALES.has(String(locale || '').trim().toLowerCase())
}

export function resolveEffectiveDisplayLocale(input: EffectiveDisplayLocaleInput): string {
  if (!isNonLatinLocale(input.locale)) return input.locale
  if (!input.nonLatinLanguageSupport || input.useSystemFont === false) return 'en-US'
  return input.locale
}

export function resolveDesignEffectiveLocale(design: {
  supportsChineseContent: boolean
  defaultLocale: string
  nonLatinLanguageSupport: boolean
}): string {
  const locale = design.supportsChineseContent ? 'zh-CN' : design.defaultLocale
  return resolveEffectiveDisplayLocale({
    locale,
    nonLatinLanguageSupport: design.nonLatinLanguageSupport,
  })
}

export function resolveDesignContentLanguage(design: {
  supportsChineseContent: boolean
  defaultLocale: string
  nonLatinLanguageSupport: boolean
}): 'zh' | 'en' {
  return isNonLatinLocale(resolveDesignEffectiveLocale(design)) ? 'zh' : 'en'
}

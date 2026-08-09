const CHINESE_LOCALES = new Set(['zh', 'zh-cn'])

export function isNonLatinLocale(locale: string): boolean {
  return CHINESE_LOCALES.has(String(locale || '').trim().toLowerCase())
}

export function resolveDesignEffectiveLocale(design: {
  supportsChineseContent: boolean
  defaultLocale: string
}): string {
  return design.supportsChineseContent ? 'zh-CN' : design.defaultLocale
}

export function resolveDesignContentLanguage(design: {
  supportsChineseContent: boolean
  defaultLocale: string
}): 'zh' | 'en' {
  return isNonLatinLocale(resolveDesignEffectiveLocale(design)) ? 'zh' : 'en'
}

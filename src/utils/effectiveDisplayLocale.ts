export function isNonLatinLocale(locale: string): boolean {
  return ['zh', 'zh-cn'].includes(String(locale || '').trim().toLowerCase())
}

export function resolveDesignEffectiveLocale(_design?: { appLanguage?: unknown }): string {
  return 'en-US'
}

export function resolveDesignContentLanguage(_design?: { appLanguage?: unknown }): 'en' {
  return 'en'
}

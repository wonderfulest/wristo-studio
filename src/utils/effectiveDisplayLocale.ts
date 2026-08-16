export function isNonLatinLocale(locale: string): boolean {
  return ['zh', 'zh-cn'].includes(String(locale || '').trim().toLowerCase())
}

export function resolveDesignEffectiveLocale(design?: { appLanguage?: unknown }): string {
  return design?.appLanguage === 'zhs' || design?.appLanguage === 'zh' ? 'zh-CN' : 'en-US'
}

export function resolveDesignContentLanguage(design?: { appLanguage?: unknown }): 'en' | 'zh' {
  return design?.appLanguage === 'zhs' || design?.appLanguage === 'zh' ? 'zh' : 'en'
}

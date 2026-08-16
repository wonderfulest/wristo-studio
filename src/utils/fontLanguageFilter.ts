import type { DateContentLanguage } from '@/utils/dateFontCompatibility'

export function getFontLanguagesForDateContent(
  language: DateContentLanguage | undefined,
): string[] | undefined {
  if (language === 'zh') return ['zh']
  if (language === 'en') return ['en']
  if (language === 'mixed') return undefined
  return undefined
}

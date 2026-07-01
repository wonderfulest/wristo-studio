import type { DateContentLanguage } from '@/utils/dateFontCompatibility'

export function getFontLanguagesForDateContent(
  language: DateContentLanguage | undefined,
): string[] | undefined {
  if (language === 'zh') return ['zh', 'multi']
  if (language === 'en') return ['en', 'multi']
  if (language === 'mixed') return ['multi']
  return undefined
}

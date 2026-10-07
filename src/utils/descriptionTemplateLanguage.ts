import type { GenerateDescriptionDto } from '@/types/api/product'

import type { DesignerDefaultConfigVO } from '@/types/api/designer-default-config'

export const DESCRIPTION_LANGUAGES = [
  { code: 'en', label: 'English' }, { code: 'zh', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' }, { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' }, { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' }, { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' }, { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' }, { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' }, { code: 'cs', label: 'Čeština' },
  { code: 'da', label: 'Dansk' }, { code: 'fi', label: 'Suomi' },
  { code: 'nb', label: 'Norsk' }, { code: 'sv', label: 'Svenska' },
  { code: 'tr', label: 'Türkçe' }, { code: 'hu', label: 'Magyar' },
  { code: 'el', label: 'Ελληνικά' }, { code: 'he', label: 'עברית' },
  { code: 'ar', label: 'العربية' }, { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'th', label: 'ไทย' }, { code: 'vi', label: 'Tiếng Việt' },
  { code: 'uk', label: 'Українська' }, { code: 'ro', label: 'Română' },
] as const
export type DescriptionTemplateLanguage = typeof DESCRIPTION_LANGUAGES[number]['code']

export const descriptionLanguageLabel = (code: string): string =>
  DESCRIPTION_LANGUAGES.find(language => language.code === code)?.label || code

const templateFields = {
  wpay: ['descriptionTemplate', 'descriptionTemplateZh'],
  garmin: ['descriptionTemplateGarmin', 'descriptionTemplateGarminZh'],
  free: ['descriptionTemplateFree', 'descriptionTemplateFreeZh'],
} as const
const paymentKey = (method: string) => method === 'garmin' ? 'garmin' : method === 'free' || method === 'none' ? 'free' : 'wpay'

export const getDescriptionTemplate = (
  config: Partial<DesignerDefaultConfigVO>, method: string, language: string,
): string => {
  const payment = paymentKey(method)
  if (language === 'en' || language === 'zh') {
    return config[templateFields[payment][language === 'zh' ? 1 : 0]] || ''
  }
  return config.descriptionTemplates?.[language]?.[payment] || ''
}

export const setDescriptionTemplate = (
  config: Partial<DesignerDefaultConfigVO>, method: string, language: string, value: string | null,
): void => {
  const payment = paymentKey(method)
  if (language === 'en' || language === 'zh') {
    config[templateFields[payment][language === 'zh' ? 1 : 0]] = value
  } else {
    config.descriptionTemplates ??= {}
    config.descriptionTemplates[language] ??= {}
    config.descriptionTemplates[language][payment] = value || ''
  }
}

export const resolveDescriptionTemplateLanguage = (
  configJson: unknown,
): DescriptionTemplateLanguage => {
  let config = configJson
  if (typeof config === 'string') {
    try {
      config = JSON.parse(config)
    } catch {
      return 'en'
    }
  }

  if (!config || typeof config !== 'object') return 'en'
  const localization = (config as { localization?: unknown }).localization
  if (!localization || typeof localization !== 'object') return 'en'
  const appLanguage = (localization as { appLanguage?: unknown }).appLanguage
  return appLanguage === 'zhs' || appLanguage === 'zh' ? 'zh' : 'en'
}

export const buildGenerateDescriptionPayload = (
  userId: number,
  productId: number,
  language: DescriptionTemplateLanguage,
): GenerateDescriptionDto => ({ userId, productId, language })

export const descriptionTemplateUsesAi = (
  config: Partial<import('@/types/api/designer-default-config').DesignerDefaultConfigVO>,
  paymentMethod: string,
  language: DescriptionTemplateLanguage,
): boolean => {
  return /\[\[\s*\$\{\s*app_ai_description\s*}\s*]]/.test(getDescriptionTemplate(config, paymentMethod, language))
}

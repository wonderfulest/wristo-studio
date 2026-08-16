import type { GenerateDescriptionDto } from '@/types/api/product'

export type DescriptionTemplateLanguage = 'en' | 'zh'

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

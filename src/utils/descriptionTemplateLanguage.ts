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

export const descriptionTemplateUsesAi = (
  config: Partial<import('@/types/api/designer-default-config').DesignerDefaultConfigVO>,
  paymentMethod: string,
  language: DescriptionTemplateLanguage,
): boolean => {
  const zh = language === 'zh'
  const template = paymentMethod === 'garmin'
    ? (zh ? config.descriptionTemplateGarminZh : config.descriptionTemplateGarmin)
    : paymentMethod === 'free'
      ? (zh ? config.descriptionTemplateFreeZh : config.descriptionTemplateFree)
      : (zh ? config.descriptionTemplateZh : config.descriptionTemplate)
  return /\[\[\s*\$\{\s*app_ai_description\s*}\s*]]/.test(template || '')
}

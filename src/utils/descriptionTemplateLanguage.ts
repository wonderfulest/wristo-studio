import type { GenerateDescriptionDto } from '@/types/api/product'

export type DescriptionTemplateLanguage = 'en' | 'zh'

export const buildGenerateDescriptionPayload = (
  userId: number,
  productId: number,
  language: DescriptionTemplateLanguage,
): GenerateDescriptionDto => ({ userId, productId, language })

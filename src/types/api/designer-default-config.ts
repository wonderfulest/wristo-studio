export interface DesignerDefaultConfigVO {
  id: number
  userId: number
  defaultPaymentMethod: string | null
  defaultPrice: number | null
  defaultCurrency: string | null
  descriptionTemplate: string | null
  descriptionTemplates?: Record<string, Partial<Record<'wpay' | 'garmin' | 'free', string>>> | null
  descriptionTemplateZh: string | null
  descriptionTemplateGarmin?: string | null
  descriptionTemplateGarminZh?: string | null
  descriptionTemplateFree?: string | null
  descriptionTemplateFreeZh?: string | null
  enableAutoPublish: number | null
  isActive: number | null
}

export interface DesignerDefaultConfigCreateDTO {
  userId: number
  defaultPaymentMethod?: string | null
  defaultPrice?: number | null
  defaultCurrency?: string | null
  descriptionTemplate?: string | null
  descriptionTemplates?: Record<string, Partial<Record<'wpay' | 'garmin' | 'free', string>>> | null
  descriptionTemplateZh?: string | null
  descriptionTemplateGarmin?: string | null
  descriptionTemplateGarminZh?: string | null
  descriptionTemplateFree?: string | null
  descriptionTemplateFreeZh?: string | null
  enableAutoPublish?: number | null
  isActive?: number | null
}

export interface DesignerDefaultConfigUpdateDTO {
  id: number
  userId?: number
  defaultPaymentMethod?: string | null
  defaultPrice?: number | null
  defaultCurrency?: string | null
  descriptionTemplate?: string | null
  descriptionTemplates?: Record<string, Partial<Record<'wpay' | 'garmin' | 'free', string>>> | null
  descriptionTemplateZh?: string | null
  descriptionTemplateGarmin?: string | null
  descriptionTemplateGarminZh?: string | null
  descriptionTemplateFree?: string | null
  descriptionTemplateFreeZh?: string | null
  enableAutoPublish?: number | null
  isActive?: number | null
}

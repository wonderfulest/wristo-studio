export interface DesignerDefaultConfigVO {
  id: number
  userId: number
  defaultPaymentMethod: string | null
  defaultPrice: number | null
  defaultCurrency: string | null
  descriptionTemplate: string | null
  enableAutoPublish: number | null
  isActive: number | null
}

export interface DesignerDefaultConfigCreateDTO {
  userId: number
  defaultPaymentMethod?: string | null
  defaultPrice?: number | null
  defaultCurrency?: string | null
  descriptionTemplate?: string | null
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
  enableAutoPublish?: number | null
  isActive?: number | null
}

export interface TemplateVariableVO {
  id: number
  variableKey: string
  sourceTable: string | null
  sourceField: string | null
  joinKey: string | null
  label: string | null
  description: string | null
  sampleValue: string | null
  dataType: string | null
  isActive: number | null
  sortOrder: number | null
  createdAt: string | null
  updatedAt: string | null
  version: number | null
}

export interface TemplateVariableListQuery {
  dataType?: string
  isActive?: number
  variableKeyLike?: string
  orderBy?: string
}

export interface TemplateVariablePreviewContextDTO {
  userId: number
  productId?: number
}

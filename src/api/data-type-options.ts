import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'

export type LabelI18nValue = string | { short?: string; medium?: string; long?: string }

export interface DataTypeOptionVO {
  id: number
  metricSymbol: string
  category: string
  valueCode: number
  value?: number
  label: string
  labelI18n?: Record<string, LabelI18nValue>
  labelCn?: string
  enLabel?: string
  displayLabel?: string
  unit?: string
  iconUnicode?: string
  icon?: string
  stringKey?: string
  defaultValue?: string
  isActive: number
  sortOrder: number
  description?: string
}

export function listDataTypeOptions(params: { category?: string; active?: number } = {}) {
  return instance.get<ApiResponse<DataTypeOptionVO[]>>('/dsn/data-type-options/list', {
    params: { active: 1, ...params }
  }) as unknown as Promise<ApiResponse<DataTypeOptionVO[]>>
}

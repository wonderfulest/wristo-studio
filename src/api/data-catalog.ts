import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'

export function getDataCatalog() {
  return instance.get<ApiResponse<unknown>>('/dsn/data-catalog', {
    params: { active: 1 }
  }) as unknown as Promise<ApiResponse<unknown>>
}

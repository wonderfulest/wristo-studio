import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
import type { TemplateVariableVO, TemplateVariableListQuery, TemplateVariablePreviewContextDTO } from '@/types/api/template-variable'

export const templateVariablesApi = {
  list(query?: TemplateVariableListQuery): Promise<ApiResponse<TemplateVariableVO[]>> {
    return instance.get('/dsn/system/template-variables', { params: query })
  },
  previewContext(dto: TemplateVariablePreviewContextDTO): Promise<ApiResponse<Record<string, unknown>>> {
    return instance.post('/dsn/system/template-variables/preview-context', dto)
  }
}

export default templateVariablesApi

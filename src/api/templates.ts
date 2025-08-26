import axiosInstance from '@/config/axiosConfigStrapi'
import type { GetTemplatesParams, TemplatesResponse } from '@/types/api/templates'

export const getTemplates = async ({ page, pageSize }: GetTemplatesParams): Promise<TemplatesResponse> => {
  const params = {
    'pagination[page]': page,
    'pagination[pageSize]': pageSize,
    'sort[0]': 'createdAt:desc',
    populate: '*', // 获取关联的设计信息
  } as Record<string, any>

  const response = await axiosInstance.get('/design-templates', {
    params,
  })
  return response.data
}

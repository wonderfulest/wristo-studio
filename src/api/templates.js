import axiosInstance from '@/config/axiosConfigStrapi'

export const getTemplates = async ({ page, pageSize }) => {
  const params = {
    'pagination[page]': page,
    'pagination[pageSize]': pageSize,
    'sort[0]': 'createdAt:desc',
    'populate': '*'  // 获取关联的设计信息
  }
  
  const response = await axiosInstance.get('/design-templates', {
    params
  })
  return response.data
}

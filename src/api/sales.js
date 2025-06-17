import axiosInstance from '@/config/axiosConfigStrapi'

export const getSalesHistory =async ({ page, pageSize }) => {
  const params = {
    'pagination[page]': page,
    'pagination[pageSize]': pageSize,
    'sort[0]': 'creationDate:desc',
    'populate': '*' // 获取关联的文件信息
  }
  const response = await axiosInstance.get('/kpay-sales/with-designer', {
    params
  })
  return response.data
}

// 添加同步销售记录接口
export const syncSalesHistory = async () => {
  const response = await axiosInstance.post('/kpay-sales/sync')
  return response.data
}


import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api'

/**
 * 上传截图
 * @param formData 表单数据
 * @returns 上传结果
 */
export const uploadScreenshot = async (formData: FormData): Promise<ApiResponse<any>> => {
  const response = await instance.post('/dsn/file/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

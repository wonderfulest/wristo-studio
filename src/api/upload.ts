import axiosInstance from '@/config/axiosConfigStrapi'
import type { UploadImageResponse } from '@/types/api/upload'

/**
 * 上传图片
 * @param formData - 表单数据
 * @returns 上传结果
 */
export const uploadImage = async (formData: FormData): Promise<UploadImageResponse> => {
  const response = await axiosInstance.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

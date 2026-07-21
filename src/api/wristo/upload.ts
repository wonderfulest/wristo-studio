import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'

/**
 * 上传截图
 * @param formData 表单数据
 * @returns 上传结果
 */
export const uploadScreenshot = async (formData: FormData): Promise<any> => {
  const response = await instance.post('/dsn/file/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

export const uploadPersistentDesignAsset = async (file: File): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', 'design-assets')
  const response = await instance.post('/dsn/file/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }) as unknown as ApiResponse<string>
  const url = String(response.data || '').trim()
  if (!url || /^blob:/i.test(url)) {
    throw new Error('Design asset upload returned an invalid URL')
  }
  return url
}

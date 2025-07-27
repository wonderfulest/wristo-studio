import instance from '@/config/axios'

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

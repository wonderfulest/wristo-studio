import instance from '@/config/axios'

/**
 * 上传截图
 * @param {FormData} formData - 表单数据
 * @returns {Promise} 上传结果
 */
export const uploadScreenshot = async (formData) => {
  const response = await instance.post('/dsn/file/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

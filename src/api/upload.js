import axiosInstance from '@/config/axiosConfigStrapi'

/**
 * 上传图片
 * @param {FormData} formData - 表单数据
 * @returns {Promise} 上传结果
 */
export const uploadImage = async (formData) => {
  const response = await axiosInstance.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

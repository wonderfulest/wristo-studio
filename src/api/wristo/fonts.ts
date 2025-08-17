/**
 * 上传字体文件
 * @param {File} file - TTF文件
 * @returns {Promise} 上传结果
 */
export const uploadFontFile = async (file) => {
    const formData = new FormData()
    formData.append('files', file, file.name)
    const response = await axiosInstance.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data[0]
}
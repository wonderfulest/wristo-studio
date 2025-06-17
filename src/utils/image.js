import { uploadScreenshot } from '@/api/wristo/upload'

// 上传指针SVG
export const uploadHandSVG = async (svgUrl, type) => {
  try {
    const response = await fetch(svgUrl)
    const blob = await response.blob()
    // 创建 FormData 对象
    const formData = new FormData()
    formData.append('file', blob, `hand.svg`)
    formData.append('type', type)
    // 上传文件
    const res = await uploadScreenshot(formData)
    console.log('uploadHandSVG res', res)
    return res.data
  } catch (error) {
    console.error('上传指针SVG失败:', error)
    throw error
  }
}

// 上传图片文件
export const uploadImageFile = async (blobUrl, type) => {
  console.log('uploadImageFile', blobUrl, type)
  try {
    // 从 blob URL 获取文件数据
    const response = await fetch(blobUrl)
    const blob = await response.blob()

    // 创建 FormData 对象
    const formData = new FormData()
    formData.append('file', blob, 'background.png')
    formData.append('type', type)

    // 上传文件
    const res = await uploadScreenshot(formData)
    console.log('uploadImageFile res', res)

    return res.data
  } catch (error) {
    console.error('上传图片失败:', error)
    throw error
  }
}

// 上传 base64 图片
export const uploadBase64Image = async (base64Data, type) => {
  try {
    // Remove data URL prefix if present
    const base64Content = base64Data.includes('base64,') ? base64Data.split('base64,')[1] : base64Data

    // Convert base64 to blob
    const byteCharacters = atob(base64Content)
    const byteArrays = []

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512)
      const byteNumbers = new Array(slice.length)

      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i)
      }

      const byteArray = new Uint8Array(byteNumbers)
      byteArrays.push(byteArray)
    }

    const blob = new Blob(byteArrays, { type: 'image/png' })

    // Create FormData and append blob
    const formData = new FormData()
    formData.append('file', blob, 'background.png')
    formData.append('type', type)
    // Upload file
    const res = await uploadScreenshot(formData)
    console.log('uploadBase64Image res', res)
    return res.data
  } catch (error) {
    console.error('Failed to upload base64 image:', error)
    throw error
  }
}

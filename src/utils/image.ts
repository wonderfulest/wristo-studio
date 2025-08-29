import { uploadScreenshot } from '@/api/wristo/upload'

export type UploadType = string

// 上传指针SVG
export const uploadHandSVG = async (svgUrl: string, type: UploadType) => {
  try {
    const response = await fetch(svgUrl)
    const blob = await response.blob()
    const formData = new FormData()
    formData.append('file', blob, `hand.svg`)
    formData.append('type', type)
    const res = await uploadScreenshot(formData)
    
    return res.data as any
  } catch (error) {
    console.error('上传指针SVG失败:', error)
    throw error
  }
}

// 上传图片文件
export const uploadImageFile = async (blobUrl: string, type: UploadType) => {
  
  try {
    const response = await fetch(blobUrl)
    const blob = await response.blob()
    const formData = new FormData()
    formData.append('file', blob, 'background.png')
    formData.append('type', type)
    const res = await uploadScreenshot(formData)
    
    return res.data as any
  } catch (error) {
    console.error('上传图片失败:', error)
    throw error
  }
}

// 上传 base64 图片
export const uploadBase64Image = async (base64Data: string, type: UploadType) => {
  try {
    const base64Content = base64Data.includes('base64,') ? base64Data.split('base64,')[1] : base64Data
    const byteCharacters = atob(base64Content)
    const byteArrays: Uint8Array[] = []
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
    const formData = new FormData()
    formData.append('file', blob, 'background.png')
    formData.append('type', type)
    const res = await uploadScreenshot(formData)
    
    return res as any
  } catch (error) {
    console.error('Failed to upload base64 image:', error)
    throw error
  }
}

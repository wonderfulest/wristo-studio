
export interface ImageBase {
  id: number
  url: string
}

export interface Image {
  id: number
  documentId: string
  name: string
  alternativeText: string
  caption: string
  width: number
  height: number
  formats: Record<string, any>
  hash: string
  ext: string
  mime: string
  size: number
  url: string
  previewUrl: string
  provider: string
  provider_metadata: Record<string, any>
  folderPath: string
  createdAt: number
  updatedAt: number
  publishedAt: number
  locale: string
} 

// 图片相关类型定义
export interface ImageFormat {
  ext: string
  url: string
  hash: string
  mime: string
  name: string
  path: string | null
  size: number
  width: number
  height: number
  sizeInBytes: number
}

export interface ImageFormats {
  large?: ImageFormat
  medium?: ImageFormat
  thumbnail?: ImageFormat
  [key: string]: ImageFormat | undefined
}

// 提交表单字段（后端 @ModelAttribute DTO）
export interface UploadFontMeta {
  fullName: string
  postscriptName: string
  family: string
  language: string
  type: string // 后端为枚举，这里用字符串，示例：'text_font'
  weight: string
  versionName: string
  glyphCount: number | string
  // 可选字段
  slug?: string
  isSystem?: number
}

// 文件信息
export interface FileVO {
  id: number
  name: string
  url: string
  previewUrl: string
  provider: string
}

// 字体 VO
export interface DesignFontVO {
  id: number
  fullName: string
  postscriptName: string
  slug: string
  family: string
  language: string
  type: string
  weight: string
  versionName: string
  glyphCount: number
  isSystem: number
  status: string
  ttf: number
  ttfFile: FileVO
}

// 字体分页查询 DTO
export interface DesignFontPageQueryDTO {
  pageNum: number
  pageSize: number
  status?: string
  slug?: string
  name?: string
  userId?: number
  type?: string
}

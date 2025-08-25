// 提交表单字段（后端 @ModelAttribute DTO）
export interface UploadFontMeta {
  fullName: string
  postscriptName: string
  family: string
  subfamily: string
  language: string
  type: string // 后端为枚举，这里用字符串，示例：'text_font'
  weight: string
  versionName: string
  glyphCount: number | string
  isSystem: number // 0/1
  isMonospace: number // 0/1
  italic: number // 0/1
  weightClass: number
  widthClass: number
  copyright: string
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
  subfamily: string
  language: string
  type: string
  weight: string
  versionName: string
  glyphCount: number
  isMonospace: number
  italic: number
  weightClass: number
  widthClass: number
  copyright: string
  isSystem: number
  status: string
  ttf: number
  ttfFile: FileVO
}

// 字体分页查询 DTO
export interface DesignFontPageQueryDTO {
  pageNum: number
  pageSize: number
  name?: string
}

// 新的字体搜索 DTO（支持多条件 + 分页）
export interface DesignFontSearchDTO {
  pageNum: number
  pageSize: number
  orderBy?: string
  name?: string
  type?: string
  isMonospace?: number // 0/1
  italic?: number // 0/1
  weight?: number
  weightClass?: number
  widthClass?: number
  onlyApprovedActive?: boolean
}

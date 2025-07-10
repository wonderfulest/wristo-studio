export interface ApiResponse<T> {
  code: number
  msg: string
  data?: T
}

export interface PageResponse<T> {
  pageNum: number
  pageSize: number
  total: number
  pages: number
  list: T[]
}

export interface UserInfo {
  id: number
  username: string
  nickname: string | null
  email: string
  phone: string | null
  avatar: string | null
  status: string | null
  createdAt: string
  updatedAt: string
  lastLoginTime: string | null
  lastLoginIp: string | null
  isDeleted: string
}

export interface LoginResponseData {
  token: string
  userInfo: UserInfo
}

export interface ImageBase {
  id: number
  url: string
}

export interface Image {
  id: number
  name: string
  caption: string
  width: number
  height: number
  formats: ImageFormats
  hash: string
  ext: string
  mime: string
  size: number
  url: string
  provider: string
  locale: string
  documentId: string
  alternativeText: string
  previewUrl: string
  provider_metadata: Record<string, any>
  folderPath: string
  createdAt: number
  updatedAt: number
  publishedAt: number
}

export type DesignStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'packaged'
  | 'published';

// 设计相关类型定义
export interface DesignElement {
  x: number
  y: number
  id: string
  font: string
  size: number
  type: string
  color: string
  timeId: number
  originX: string
  originY: string
  formatter: number
  [key: string]: any // 允许其他扩展属性
}

export interface DesignConfig {
  name: string
  kpayId: string
  wpayId: number
  version: string
  designId: string
  elements: DesignElement[]
  orderIds: string[]
  showUnit: boolean
  textCase: number
  properties: Record<string, any>
  wpayEnabled: boolean
  labelLengthType: number
  themeBackgroundImages: any[]
  [key: string]: any // 允许其他扩展属性
}

export interface Design {
  id: number
  designUid: string
  name: string
  description: string
  configJson: DesignConfig | null
  designStatus: DesignStatus
  kpayId: string
  wpayId: string
  payMethod: string
  garminAppUuid: string
  isActive: number
  isDeleted: number
  createdAt: number
  updatedAt: number
  version: number
  user: {
    id: number
    username: string
    nickname: string | null
    avatar: string
  }
  coverImage?: Image | null
  backgroundImage?: Image | null
}

export interface DesignV2 {
  id: number
  designUid: string
  name: string
  description: string
  configJson: DesignConfig | null
  designStatus: DesignStatus
  isActive: number
  isDeleted: number
  createdAt: number
  updatedAt: number
  version: number
  user: {
    id: number
    username: string
    nickname: string | null
    avatar: string
  }
  coverImage?: Image | null
  backgroundImage?: Image | null
  payment?: Payment | null
  release?: Release | null
}

export interface Payment {
  id: number
  designUid: string
  paymentMethod: string
  kpayId: string
  price: number
  trialLasts: number
}

export interface DesignPageParams {
  pageNum: number
  pageSize: number
  orderBy?: string
  populate?: string
  userId?: number
  status?: string
  name?: string
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

import type { UserBase } from './user'
import type { Image, ImageBase } from './image'
import type { Product } from './product'
import { Category } from './category'

/**
 * 创建设计的请求参数
 */
export interface CreateDesignParams {
  name: string
  description: string
}

/**
 * 创建复制的请求参数 
 */
export interface CreateCopyDesignParams {
  uid: string
}

/**
 * 更新设计的请求参数
 */
export interface UpdateDesignParamsV2 {
  uid: string
  name?: string
  description?: string
  coverImage?: ImageBase
  backgroundImage?: ImageBase
  configJson?: any
  designStatus?: DesignStatus
  userId?: number
}

/**
 * 提交设计的请求参数
 */
export interface DesignSubmitDTO {
  designUid: string
  paymentMethod: string
  name?: string
  description?: string
  kpayId?: string
  price?: number
  trialLasts?: number
}

export interface FetchDesignReviewPageParams {
  pageNum: number
  pageSize: number
  userId?: number
  orderBy?: string
  designStatus?: string
  designUid?: string
  name?: string
  populate?: string
}

export interface Design {
  id: number
  designUid: string
  name: string
  description: string
  configJson: DesignConfig | null
  designStatus: DesignStatus
  reviewComment?: string | null
  isActive: number
  isDeleted: number
  createdAt: number
  updatedAt: number
  version: number
  user: UserBase
  cover?: Image | null
  backgroundImage?: Image | null
  product: Product
  categories?: Category[] | null
}

export type DesignStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'packaged'
  | 'published'

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
  version: string
  designId: string
  elements: DesignElement[]
  orderIds: string[]
  showUnit: boolean
  textCase: number
  properties: Record<string, any>
  labelLengthType: number
  themeBackgroundImages: any[]
  currentIconFontSlug: string // 当前图标字体(适用于icon、indicator元素)
  currentIconFontSize: number // 当前图标字体大小(适用于icon、indicator元素)
  [key: string]: any // 允许其他扩展属性
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
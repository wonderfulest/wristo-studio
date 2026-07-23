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
  payment?: ProductPaymentUpdateParams
  tagIds?: number[]
  categoryIds?: number[]
  bundleIds?: number[]
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
  tagIds?: number[]
  categoryIds?: number[]
  bundleIds?: number[]
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
  assetBundleUrl?: string | null
  assetBundleHash?: string | null
  assetBundleSize?: number | null
  assetBundleVersion?: number | null
  assetBundleUpdatedAt?: string | null
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

export type LaunchStatus = 'launched' | 'not_launched' | 'update_available'

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
  textCase: number
  bitmapMode?: boolean
  dataNumberFormat?: number
  maxFieldLength?: number
  properties: Record<string, any>
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

export interface ProductPaymentUpdateParams {
  productId?: number
  paymentMethod: 'free' | 'wpay' | string
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
  designStatus?: DesignStatus
  launchStatus?: LaunchStatus
  name?: string
  appId?: number
  scope?: 'mine' | 'all'
  device?: string
} 

export interface DesignDetailParams {
  populate?: string
  device?: string
}

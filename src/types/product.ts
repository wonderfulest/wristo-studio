import type { UserBase } from './user'
import type { Image } from './image'
import type { Category } from './category'

export interface Product {
  appId: number
  designId: string
  name: string
  description: string
  garminImageUrl: string
  garminStoreUrl: string
  garminAppUuid: string
  payment: ProductPayment | null
  packageLog: ProductPackagingLog | null
  release: ProductRelease | null
  categories: Category[]
  heroImages: Image[]
  bannerImages: Image[]
  user: UserBase
  trialLasts: number
  createdAt: number
  updatedAt: number
  isActive: number
  isDeleted: number
}

export interface ProductRelease {
  id: number
  productId: number
  releaseVersion: string
  releaseTime: number
  packageUrl: string
  releaseNote: string
  packageSize: number
  packageMd5: string
  deviceIds: string
  isDeleted: number
  createdAt: number
  updatedAt: number
  version: number
} 

export interface ProductPayment {
  paymentMethod: string
  paymentMethodDesc: string
  kpayId: string
  wpayId: string
  price: number
  currency: string
  paddleProductId: string
  paddlePriceId: string
}

export interface ProductPackagingLog {
  id: number
  product: ProductBase
  packagingStatus: string
  errorMessage: string
  createdAt: number
  updatedAt: number
  version: number
  isDeleted: number
  isActive: number
}

export interface ProductBase {
  appId: number
  name: string
  designId: string
  price?: number // @Deprecated
  garminImageUrl?: string // @Deprecated
  garminStoreUrl?: string // @Deprecated
  heroFile?: any // @Deprecated
}

export interface ProductPageQuery {
  pageNum: number
  pageSize: number
  orderBy?: string
  name?: string
  populate?: string
}

/** 产品创建数据传输对象 */
export interface CreateProductDto {
  /** 产品名称 */
  name: string
  /** 产品描述 */
  description: string
  /** 支付方式 */
  paymentMethod: string
  /** KPay ID */
  kpayId?: string
  /** 产品价格 */
  price: number
  /** 试用时长(小时) */
  trialLasts: number
  /** 设计ID */
  designId: string
  /** Garmin 商店图片URL */
  garminImageUrl?: string
  /** Garmin 商店URL */
  garminStoreUrl?: string
}

/** 产品支付信息 */
export interface ProductPaymentDto {
  /** 支付方式 */
  paymentMethod: string
  /** 价格 */
  price: number
  /** 试用时长(小时) */
  trialLasts: number
}

/** 产品上线数据传输对象 */
export interface GoToLiveDto {
  /** 应用ID */
  appId: number
  /** Garmin 商店URL */
  garminStoreUrl?: string
  /** 英雄图URL */
  heroImage?: string
  /** 支付信息 */
  payment: ProductPaymentDto
  /** 分类ID列表 */
  categoryIds: number[]
}

/** 产品更新数据传输对象 */
export interface ProductUpdateDto {
  /** 应用ID */
  appId?: number
  /** 用户ID */
  userId?: number
  /** 产品名称 */
  name?: string
  /** 产品描述 */
  description?: string
  /** Garmin 商店图片URL */
  garminImageUrl?: string
  /** Garmin 商店URL */
  garminStoreUrl?: string
  /** Garmin 应用UUID */
  garminAppUuid?: string
  /** 试用期限 */
  trialLasts?: number
  /** 支付方式 */
  paymentMethod?: string
  /** KPay ID */
  kpayId?: string
  /** 价格 */
  price?: number
  /** 设计ID */
  designId: string
  /** 下载量 */
  download?: number
  /** 购买量 */
  purchase?: number
  /** 封面图文件 */
  heroFile?: any
  /** 背景图文件 */
  backgroundFile?: any
  /** 是否激活 */
  isActive?: number
  /** 打包状态 */
  packageStatus?: number
  /** 状态 */
  status?: number
}

/** 产品支付信息视图对象 */
export interface ProductPaymentVo {
  /** 支付方式 */
  paymentMethod: string
  /** 支付方式描述 */
  paymentMethodDesc: string
  /** KPay ID */
  kpayId: string
  /** WPay ID */
  wpayId: string
  /** 价格 */
  price: number
  /** 货币 */
  currency: string
  /** Paddle 产品ID */
  paddleProductId: string
}

/** 产品发布信息视图对象 */
export interface ProductReleaseVo {
  /** 发布ID */
  id: number
  /** 产品ID */
  productId: number
  /** 发布版本 */
  releaseVersion: string
  /** 发布时间 */
  releaseTime: number
  /** 包URL */
  packageUrl: string
  /** 发布说明 */
  releaseNote: string
  /** 包大小 */
  packageSize: number
  /** 包MD5 */
  packageMd5: string
  /** 设备ID列表 */
  deviceIds: string
  /** 是否删除 */
  isDeleted: number
  /** 创建时间 */
  createdAt: number
  /** 更新时间 */
  updatedAt: number
  /** 版本号 */
  version: number
}

/** 产品打包日志视图对象 */
export interface ProductPackagingLogVo {
  /** 日志ID */
  id: number
  /** 产品信息 */
  product: ProductBase
  /** 打包状态 */
  packagingStatus: string
  /** 错误信息 */
  errorMessage: string
  /** 创建时间 */
  createdAt: number
  /** 更新时间 */
  updatedAt: number
  /** 版本号 */
  version: number
  /** 是否删除 */
  isDeleted: number
  /** 是否激活 */
  isActive: number
} 
import type { Category } from './category'
import type { Image } from './image'
import type { UserBase } from './user'
import type { Bundle } from './bundle'
import type { DescriptionTemplateLanguage } from '@/utils/descriptionTemplateLanguage'
import type { ProductImageItem } from '../product'
import type { ProductTag } from './productTag'

export interface ProductPaymentVo {
  paymentMethod: string
  paymentMethodDesc: string
  kpayId: string
  wpayId: string
  price: number
  currency: string
  paddleProductId: string
  paddlePriceId: string
  /** 试用时长(小时)，与后端 DTO 字段对齐 */
  trialLasts?: number
}

export interface ProductBase {
  appId: number
  name: string
  designId: string
}

export interface ProductPackagingLogVo {
  id: number
  packagingStatus: string
  errorMessage: string
  lastBuildLogPath?: string | null
  createdAt: number
  updatedAt: number
  version: number
  isDeleted: number
  isActive: number
  /** packaging type: iq or prg */
  type?: string
  /** device id for this packaging task */
  deviceId?: string
  /** queue priority, 0 is highest, larger is lower; null means not in queue */
  priority?: number | null
  /** rank in queue, null means not in queue */
  rank?: number | null
  product: ProductBase
  /** all prg packaging logs for same app, including running and finished */
  prgProductPackagingLogs?: ProductPackagingLogVo[]
}

export interface ProductPackagingBuildLogVo {
  id: number
  path: string
  content: string
}

export interface ProductReleaseVo {
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

export interface ProductReleasePrgVo {
  id: number
  productId: number
  deviceId: string
  releaseVersion: string
  releaseTime: number
  prgUrl: string
  releaseNote: string
  packageSize: number
  packageMd5: string
  isDeleted: number
  createdAt: number
  updatedAt: number
  version: number
}

export interface Product {
  id: number
  appId: number
  designId: string
  name: string
  description: string
  price: number
  rawImageUrl: string
  garminImageUrl: string
  garminStoreUrl: string
  youtubeUrl?: string
  garminAppUuid: string
  trialLasts: number
  download?: number
  purchase?: number
  categories: Category[]
  heroImages: Image[]
  bannerImageUrl: string
  user: UserBase
  createdAt: number
  updatedAt: number
  isActive: number
  isDeleted: number
  status: number
  payment: ProductPaymentVo
  /** legacy packaging log */
  packageLog: ProductPackagingLogVo
  /** iq packaging log */
  packagingLog?: ProductPackagingLogVo
  /** prg packaging log */
  prgPackagingLog?: ProductPackagingLogVo
  release: ProductReleaseVo
  prgRelease?: ProductReleasePrgVo
  bundles: Bundle[]
  tags?: ProductTag[] | null
  lastGoLive: number | string | null
  score: number
  previewImageUrl?: string
  productImages?: ProductImageItem[]
}

export interface GenerateDescriptionDto {
  userId: number
  productId: number
  language: DescriptionTemplateLanguage
}

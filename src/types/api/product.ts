import type { Category } from './category'
import type { Image } from './image'
import type { UserBase } from './user'
import type { Bundle } from './bundle'

export interface ProductPaymentVo {
  paymentMethod: string
  paymentMethodDesc: string
  kpayId: string
  wpayId: string
  price: number
  currency: string
  paddleProductId: string
  paddlePriceId: string
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
  createdAt: number
  updatedAt: number
  version: number
  isDeleted: number
  isActive: number
  product: ProductBase
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
  garminAppUuid: string
  trialLasts: number
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
  packageLog: ProductPackagingLogVo
  release: ProductReleaseVo
  prgRelease?: ProductReleasePrgVo
  bundles: Bundle[]
  lastGoLive: number
}

export interface GenerateDescriptionDto {
  userId: number
  productId: number
}

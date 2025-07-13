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

export interface CreateProductDto {
  name: string
  description: string
  garminImageUrl?: string
  garminStoreUrl?: string
  trialLasts?: number
  price?: number
} 
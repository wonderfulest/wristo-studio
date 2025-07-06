import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api'

/**
 * 产品相关接口类型定义
 */
export interface WPayProduct {
  appId: number
  designId: string
  userId: number
  paddleProductId: string
  paddlePriceId: string
  name: string
  description: string
  price: number
  garminImageUrl: string
  garminStoreUrl: string
  garminAppUuid: string
  trialLasts: number
  createdAt: number
  updatedAt: number
  isActive: number
  isDeleted: number
  download: number
  purchase: number
  heroFile: any
  backgroundFile: any
  categories: any
  packageStatus: number
}

/**
 * 创建或更新产品的请求参数
 */
export interface CreateOrUpdateProductParams {
  designId: string
  name: string
  description: string
  trialLasts: number
  price: number
  garminImageUrl: string
  garminStoreUrl: string
}

/**
 * 产品相关API接口
 */
export const productsApi = {
  /**
   * 根据设计ID创建或获取产品
   * @param data 产品数据
   * @returns 产品信息
   */
  getOrCreateByDesignId(data: CreateOrUpdateProductParams): Promise<ApiResponse<WPayProduct>> {
    return instance.post('/dsn/products/getOrCreateByDesignId', {
      designId: data.designId,
      name: data.name,
      description: data.description,
      trialLasts: data.trialLasts,
      price: data.price,
      garminImageUrl: data.garminImageUrl,
      garminStoreUrl: data.garminStoreUrl
    })
  },

  /**
   * 根据设计ID更新产品信息
   * @param data 产品数据
   * @returns 更新结果
   */
  updateByDesignId(data: CreateOrUpdateProductParams): Promise<ApiResponse<WPayProduct>> {
    return instance.post('/dsn/products/updateByDesignId', {
      designId: data.designId,
      name: data.name,
      description: data.description,
      trialLasts: data.trialLasts,
      price: data.price,
      garminImageUrl: data.garminImageUrl,
      garminStoreUrl: data.garminStoreUrl
    })
  }
}

export default productsApi 
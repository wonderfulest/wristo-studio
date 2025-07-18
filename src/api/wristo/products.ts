import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api'
import type { Product } from '@/types/product'

/**
 * 产品相关API接口
 */
export const productsApi = {
  /**
   * 根据设计ID创建或获取产品
   * @param data 产品数据
   * @returns 产品信息
   */
  getOrCreateByDesignId(data: {
    designId: string
    name: string
    description: string
    trialLasts: number
    price: number
    garminImageUrl: string
    garminStoreUrl: string
  }): Promise<ApiResponse<Product>> {
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
  updateByDesignId(data: {
    designId: string
    name: string
    description: string
    trialLasts: number
    price: number
    garminImageUrl: string
    garminStoreUrl: string
  }): Promise<ApiResponse<Product>> {
    return instance.post('/dsn/products/updateByDesignId', {
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
   * Go Live 接口
   * @param data 产品数据
   * @returns 更新结果
   */
  goLive(data: {
    heroImage: string
    appId: number
    garminStoreUrl: string
    payment: {
      paymentMethod: string
      price: number
      trialLasts: number
    }
  }): Promise<ApiResponse<Product>> {
    return instance.post('/dsn/products/goLive', {
      heroImage: data.heroImage,
      appId: data.appId,
      garminStoreUrl: data.garminStoreUrl,
      payment: data.payment
    })
  }
}

export default productsApi 
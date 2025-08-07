import instance from '@/config/axios'
import { ApiResponse } from '@/types/api'
import type { 
  Product, 
  GoToLiveDto, 
  ProductUpdateDto,
  CreateProductDto,
} from '@/types/product'
import type { Bundle } from '@/types/bundle'

/**
 * 产品相关API接口
 */
export const productsApi = {
  /**
   * 根据设计ID获取或创建产品
   * @param data 产品创建数据
   * @returns 产品信息
   */
  getOrCreateByDesignId(data: CreateProductDto): Promise<Product> {
    return instance.post('/dsn/products/getOrCreateByDesignId', data)
  },

  /**
   * 根据设计ID更新产品信息
   * @param data 产品更新数据
   * @returns 更新后的产品信息
   */
  updateByDesignId(data: ProductUpdateDto): Promise<Product> {
    return instance.post('/dsn/products/updateByDesignId', data)
  },

  /**
   * Go Live 接口
   * @param data 产品上线数据
   * @returns 是否成功
   */
  goLive(data: GoToLiveDto): Promise<boolean> {
    return instance.post('/dsn/products/goLive', data)
  },

  /**
   * 获取 bundles
   * @returns bundles
   */
  getBundles(): Promise<ApiResponse<Bundle[]>> {
    return instance.get('/dsn/bundles/all')
  }
}

export default productsApi 
import instance from '@/config/axios'
import type { 
  ApiResponse, 
  Design, 
  DesignPageParams, 
  PageResponse,
  Image,
  ImageBase
} from '@/types/api'

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
export interface UpdateDesignParams {
  uid?: string
  name?: string
  description?: string
  designStatus?: string
  kpayId?: string
  wpayId?: string
  payMethod?: string
  garminAppUuid?: string
  coverImage?: ImageBase
  backgroundImage?: ImageBase
  configJson?: any
}

/**
 * 设计相关API接口
 */
export const designApi = {
  /**
   * 分页查询设计列表
   * @param params 查询参数
   * @returns 设计列表分页数据
   */
  getDesignPage(params: DesignPageParams): Promise<ApiResponse<PageResponse>> {
    return instance.get('/dsn/design/page', { params })
  },

  /**
   * 根据UID获取设计详情
   * @param designUid 设计UID
   * @returns 设计详情
   */
  getDesignByUid(designUid: string): Promise<ApiResponse<Design>> {
    return instance.get(`/dsn/design/uid/${designUid}`)
  },

  /**
   * 删除设计
   * @param designUid 设计UID
   * @returns 删除结果
   */
  deleteDesign(designUid: string): Promise<ApiResponse<null>> {
    return instance.post(`/dsn/design/delete/${designUid}`)
  },

  /**
   * 创建设计
   * @param data 设计数据
   * @returns 创建结果
   */
  createDesign(data: CreateDesignParams): Promise<ApiResponse<Design>> {
    return instance.post('/dsn/design/create', data)
  },

  /**
   * 创建设计
   */
  createDesignByCopy(data: CreateCopyDesignParams): Promise<ApiResponse<Design>> {
    return instance.post('/dsn/design/create-by-copy', data)
  },
  /**
   * 更新设计
   * @param data 设计数据
   * @returns 更新结果
   */
  updateDesign(data: UpdateDesignParams): Promise<ApiResponse<Design>> {
    return instance.post(`/dsn/design/update/${data.uid}`, data)
  },

  /**
   * 获取设计的最佳显示图片URL
   * @param design 设计对象
   * @param preferCover 是否优先使用封面图片
   * @returns 图片URL或null
   */
  getDesignImageUrl(design: Design, preferCover: boolean = true): string | null {
    if (preferCover && design.coverImage) {
      return design.coverImage.url
    }
    if (design.backgroundImage) {
      return design.backgroundImage.url
    }
    if (!preferCover && design.coverImage) {
      return design.coverImage.url
    }
    return null
  },

  /**
   * 获取图片的缩略图URL
   * @param image 图片对象
   * @returns 缩略图URL或原图URL
   */
  getImageThumbnailUrl(image: Image): string {
    return image.formats?.thumbnail?.url || image.url
  },

  /**
   * 获取图片的中等尺寸URL
   * @param image 图片对象
   * @returns 中等尺寸URL或原图URL
   */
  getImageMediumUrl(image: Image): string {
    return image.formats?.medium?.url || image.url
  },

  /**
   * 获取图片的大尺寸URL
   * @param image 图片对象
   * @returns 大尺寸URL或原图URL
   */
  getImageLargeUrl(image: Image): string {
    return image.formats?.large?.url || image.url
  }
}

export default designApi

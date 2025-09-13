import instance from '@/config/axios'
import type { 
  PageResponse,
  ApiResponse,
} from '@/types/api/api'
import type { 
  Design, 
  DesignPageParams,
  CreateDesignParams,
  UpdateDesignParamsV2,
  DesignSubmitDTO,
} from '@/types/api/design'
import type { Image } from '@/types/image'

/**
 * 设计相关API接口
 */
export const designApi = {
  /**
   * 分页查询设计列表
   * @param params 查询参数
   * @returns 设计列表分页数据
   */
  getDesignPage(params: DesignPageParams): Promise<ApiResponse<PageResponse<Design>>> {
    return instance.get('/dsn/design/page', { params })
  },

  /**
   * 获取设计详情
   * @param designUid 设计UID
   * @returns 设计详情
   */
  getDesignByUid(designUid: string): Promise<ApiResponse<Design>> {
    return instance.get(`/dsn/design/uid/${designUid}?populate=configJson,product,payment,category`)
  },

  /**
   * 创建设计
   */
  createDesignByCopy(data: { uid: string }): Promise<ApiResponse<Design>> {
    return instance.post('/dsn/design/create-by-copy', data)
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
  },

  /**
   * 创建设计
   * @param data 设计数据
   * @returns 创建结果
   */
  createDesign(data: CreateDesignParams): Promise<ApiResponse<Design>> {
    return instance.post(`/dsn/design/create`, data)
  },
  /**
   * 删除设计
   * @param designUid 设计UID
   * @returns 删除结果
   */
  deleteDesign(designUid: string): Promise<boolean> {
    return instance.post(`/dsn/design/delete/${designUid}`)
  },

  /**
   * 获取设计图片URL
   * @param design 设计
   * @param preferCover 是否优先使用封面
   * @returns 图片URL
   */
  getDesignImageUrl(design: Design, preferCover: boolean = true): string | null {
    if (preferCover && design.cover) {
      return design.cover.url
    }
    if (design.backgroundImage) {
      return design.backgroundImage.url
    }
    if (!preferCover && design.cover) {
      return design.cover.url
    }
    return null
  },
  /**
   * 更新设计
   * @param data 设计数据
   * @returns 更新结果
   */
  updateDesign(data: UpdateDesignParamsV2): Promise<Design> {
    return instance.post(`/dsn/design/update`, data)
  },
  /**
   * 提交设计
   * @param designUid 设计UID
   * @returns 提交结果
   */
  submitDesign(data: DesignSubmitDTO): Promise<Design> {
    return instance.post(`/dsn/design/submit`, data)
  }
}

export default designApi

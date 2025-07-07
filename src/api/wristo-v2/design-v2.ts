import instance from '@/config/axios'
import type { 
  ApiResponse, 
  DesignPageParams, 
  PageResponse,
  ImageBase,
  DesignV2,
  Design
} from '@/types/api'

const baseV2Url = '/dsn/design/v2'

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
  getDesignPage(params: DesignPageParams): Promise<ApiResponse<PageResponse<DesignV2>>> {
    return instance.get(`${baseV2Url}/page`, { params })
  },

  /**
   * 根据UID获取设计详情
   * @param designUid 设计UID
   * @returns 设计详情
   */
  getDesignByUid(designUid: string): Promise<ApiResponse<DesignV2>> {
    return instance.get(`${baseV2Url}/uid/${designUid}`)
  },

  getDesignImageUrl(design: DesignV2, preferCover: boolean = true): string | null {
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
   * 更新设计
   * @param data 设计数据
   * @returns 更新结果
   */
  updateDesign(data: UpdateDesignParamsV2): Promise<ApiResponse<DesignV2>> {
    return instance.post(`${baseV2Url}/update`, data)
  },
  
}

export default designApi

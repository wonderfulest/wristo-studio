import instance from '@/config/axios'
import type { 
  PageResponse,
  ApiResponse,
} from '@/types/api/api'
import type { 
  Design, 
  DesignPageParams,
  DesignDetailParams,
  CreateDesignParams,
  UpdateDesignParamsV2,
  DesignSubmitDTO,
} from '@/types/api/design'
import type { Image } from '@/types/image'
import type { ProductPackagingBuildLogVo } from '@/types/api/product'

/**
 * 规范化字符串：清理各种特殊空白字符
 * - 将特殊空白符（不间断空格、全角空格等）替换为普通空格
 * - 删除零宽字符（零宽空格、BOM等）
 * - 压缩多空格为单空格
 * - 去除首尾空格
 */
function normalizeWhitespace(str: string | undefined | null): string | undefined | null {
  if (str == null) return str
  return str
    // 所有奇怪空白 → 普通空格 (U+00A0, U+1680, U+2000-U+200A, U+202F, U+205F, U+3000)
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // 零宽字符删除 (U+200B-U+200D, U+FEFF)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // 多空格压缩
    .replace(/\s+/g, ' ')
    .trim()
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
  getDesignPage(params: DesignPageParams): Promise<ApiResponse<PageResponse<Design>>> {
    return instance.get('/dsn/design/page', { params })
  },

  /**
   * 获取模板设计列表（Sample Projects）
   * 对应后端 /api/dsn/design/templates
   */
  getTemplateDesigns(params: { device?: string; populate?: string }): Promise<ApiResponse<Design[]>> {
    return instance.get('/dsn/design/templates', { params })
  },

  /**
   * 获取设计详情
   * @param designUid 设计UID
   * @returns 设计详情
   */
  getDesignByUid(designUid: string, params: DesignDetailParams = {}): Promise<ApiResponse<Design>> {
    return instance.get(`/dsn/design/uid/${designUid}`, {
      params: {
        populate: 'user,product,payment,release,cover,image,category,bundle,configJson,package_log',
        ...params,
      },
    })
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
    // 清理 name 和 description 中的特殊空白字符
    const cleanedData = {
      ...data,
      name: normalizeWhitespace(data.name),
      description: normalizeWhitespace(data.description),
    }
    return instance.post(`/dsn/design/create`, cleanedData)
  },
  /**
   * 删除设计
   * @param designUid 设计UID
   * @returns 删除结果
   */
  deleteDesign(designUid: string): Promise<ApiResponse<boolean>> {
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
  updateDesign(data: UpdateDesignParamsV2): Promise<ApiResponse<Design>> {
    // 清理 name 和 description 中的特殊空白字符
    const cleanedData = {
      ...data,
      name: normalizeWhitespace(data.name),
      description: normalizeWhitespace(data.description),
    }
    return instance.post(`/dsn/design/update`, cleanedData)
  },
  /**
   * 提交设计
   * @param designUid 设计UID
   * @returns 提交结果
   */
  submitDesign(data: DesignSubmitDTO): Promise<ApiResponse<Design>> {
    // 清理 name 和 description 中的特殊空白字符
    const cleanedData = {
      ...data,
      name: normalizeWhitespace(data.name),
      description: normalizeWhitespace(data.description),
    }
    return instance.post(`/dsn/design/submit`, cleanedData)
  },

  /**
   * 提交 PRG 打包任务
   * @param designUid 设计UID
   * @param deviceId 设备ID
   */
  submitPrgPackageTask(designUid: string, deviceId: string): Promise<ApiResponse<boolean>> {
    return instance.post(`/dsn/design/submit-prg-package?designUid=${designUid}&deviceId=${deviceId}`)
  },

  getPackagingBuildLog(logId: number): Promise<ApiResponse<ProductPackagingBuildLogVo>> {
    return instance.get(`/public/product-packaging-logs/${logId}/build-log`)
  }
}

export default designApi

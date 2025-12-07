import instance from '@/config/axios'
import type { ApiResponse, PageResponse } from '@/types/api/api'
import type { AnalogAssetVO, AnalogAssetPageQueryDTO, AnalogAssetType } from '@/types/api/analog-asset'

/**
 * 指针表盘素材相关API接口
 */
export const analogAssetApi = {
  /**
   * 上传素材文件
   * @param file 文件
   * @param type 素材类型
   * @returns 上传结果
   */
  upload(file: File, type: AnalogAssetType): Promise<ApiResponse<AnalogAssetVO>> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    return instance.post('/dsn/analog-asset/upload?populate=asset', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /**
   * 分页查询素材
   * @param dto 查询参数
   * @returns 分页结果
   */
  page(dto: AnalogAssetPageQueryDTO): Promise<ApiResponse<PageResponse<AnalogAssetVO>>> {
    return instance.post('/dsn/analog-asset/page?populate=asset', dto)
  }
}

export default analogAssetApi

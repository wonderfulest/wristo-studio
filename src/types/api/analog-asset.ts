import type { PageQueryDTO } from './api'

/**
 * 指针表盘素材类型枚举
 */
export type AnalogAssetType = 'hour' | 'minute' | 'second' | 'tick12' | 'tick60' | 'romans'

/**
 * 文件VO
 */
export interface FileVO {
  id: number
  name: string
  url: string
  previewUrl?: string
  provider?: string
}

/**
 * 指针表盘素材VO
 */
export interface AnalogAssetVO {
  id: number
  analogAssetType: AnalogAssetType
  fileId: number
  userId?: number
  isSystem: boolean
  isDeleted: boolean
  version?: number
  isActive: boolean
  /** 关联的文件（可选填充） */
  file?: FileVO
}

/**
 * 指针表盘素材分页查询DTO
 */
export interface AnalogAssetPageQueryDTO extends PageQueryDTO {
  /** 素材类型 */
  analogAssetType?: AnalogAssetType
  /** 是否系统素材 */
  isSystem?: boolean
  /** 是否启用 */
  isActive?: boolean
  /** 用户ID */
  userId?: number
}

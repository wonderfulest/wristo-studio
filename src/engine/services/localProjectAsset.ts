import type { AnalogAssetType, AnalogAssetVO } from '@/types/api/analog-asset'

let nextLocalAssetId = -1
/** Temporary editor identity; the WRT writer replaces it with a package path. */
export function createLocalProjectAsset(file: File, type: AnalogAssetType): AnalogAssetVO {
  const id = nextLocalAssetId--
  return {
    id, fileId: id, analogAssetType: type,
    isSystem: false, isShared: false, isDeleted: false, isActive: true,
    file: { id, name: file.name, url: URL.createObjectURL(file) },
  }
}

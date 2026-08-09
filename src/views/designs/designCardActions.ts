type PackagingState = {
  packagingLog?: {
    rank?: number | null
  }
  prgPackagingLog?: {
    deviceId?: string | null
    packagingStatus?: string | null
    createdAt?: string | number | null
    rank?: number | null
  }
  prgRelease?: {
    id?: number | null
    deviceId?: string | null
    prgUrl?: string | null
    updatedAt?: string | number | null
  }
}

export type PrgCardAction = 'none' | 'build' | 'cancel' | 'cancelling'
export const PRG_REBUILD_DELAY_MS = 10 * 60 * 1000

const timestamp = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') return null
  const result = typeof value === 'number' ? value : Date.parse(value)
  return Number.isFinite(result) ? result : null
}

export const getPrgCardAction = (
  product: PackagingState | null | undefined,
  designUpdatedAt: string | number | null | undefined,
  selectedDeviceId: string,
  nowMs = Date.now(),
): PrgCardAction => {
  if (!product || !selectedDeviceId || timestamp(designUpdatedAt) === null) return 'none'
  const task = product.prgPackagingLog
  if (task?.deviceId === selectedDeviceId
    && ['init', 'pending', 'cancel_requested'].includes(task.packagingStatus || '')) {
    if (task.packagingStatus === 'cancel_requested') return 'cancelling'
    const createdAt = timestamp(task.createdAt)
    return createdAt !== null && nowMs >= createdAt + PRG_REBUILD_DELAY_MS ? 'cancel' : 'none'
  }
  const release = product.prgRelease
  if (release?.deviceId !== selectedDeviceId) return 'build'
  const releaseAt = timestamp(release.updatedAt)
  if (releaseAt === null) return 'build'
  const designAt = timestamp(designUpdatedAt)!
  return designAt > releaseAt || nowMs >= releaseAt + PRG_REBUILD_DELAY_MS ? 'build' : 'none'
}

export const shouldShowBuildIqButton = (product?: PackagingState | null) => {
  if (!product) return false

  const rank = product.packagingLog?.rank
  return rank === null || rank === undefined
}

export const shouldShowPreviewPrgButton = (product?: PackagingState | null) => {
  return !!product?.prgRelease?.id && !!product.prgRelease.prgUrl?.trim()
}

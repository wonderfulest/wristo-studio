type Timestamp = string | number | null | undefined

type PackagingState = {
  packagingLog?: { rank?: number | null }
  prgPackagingLog?: {
    deviceId?: string | null
    packagingStatus?: string | null
    createdAt?: Timestamp
    rank?: number | null
  }
  prgRelease?: {
    id?: number | null
    deviceId?: string | null
    prgUrl?: string | null
    updatedAt?: Timestamp
  }
}

export type PrgCardAction = 'none' | 'build' | 'cancel' | 'cancelling'
export const PRG_REBUILD_DELAY_MS = 10 * 60 * 1000

const isSameDevice = (deviceId: string | null | undefined, selectedDeviceId: string) => {
  return !!selectedDeviceId && deviceId === selectedDeviceId
}

const toTimestamp = (value: Timestamp) => {
  if (value === null || value === undefined || value === '') return null
  const result = typeof value === 'number' ? value : Date.parse(value)
  return Number.isFinite(result) ? result : null
}

export const shouldShowBuildIqButton = (product?: PackagingState | null) => {
  if (!product) return false
  const rank = product.packagingLog?.rank
  return rank === null || rank === undefined
}

export const getPrgCardAction = (
  product: PackagingState | null | undefined,
  designUpdatedAt: Timestamp,
  selectedDeviceId: string,
  nowMs = Date.now(),
): PrgCardAction => {
  const designAt = toTimestamp(designUpdatedAt)
  if (!product || !selectedDeviceId || designAt === null) return 'none'

  const task = product.prgPackagingLog
  if (isSameDevice(task?.deviceId, selectedDeviceId)
    && ['init', 'pending', 'cancel_requested'].includes(task?.packagingStatus || '')) {
    if (task?.packagingStatus === 'cancel_requested') return 'cancelling'
    const createdAt = toTimestamp(task?.createdAt)
    return createdAt !== null && nowMs >= createdAt + PRG_REBUILD_DELAY_MS ? 'cancel' : 'none'
  }

  const release = product.prgRelease
  if (!isSameDevice(release?.deviceId, selectedDeviceId)) return 'build'
  const releaseAt = toTimestamp(release?.updatedAt)
  if (releaseAt === null) return 'build'
  return designAt > releaseAt || nowMs >= releaseAt + PRG_REBUILD_DELAY_MS ? 'build' : 'none'
}

export const shouldShowPreviewPrgButton = (
  product: PackagingState | null | undefined,
  selectedDeviceId: string,
) => {
  const release = product?.prgRelease
  return isSameDevice(release?.deviceId, selectedDeviceId)
    && !!release?.id
    && !!release.prgUrl?.trim()
}

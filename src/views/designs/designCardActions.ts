type Timestamp = string | number | null | undefined

type PackagingState = {
  packagingLog?: { rank?: number | null }
  prgPackagingLog?: {
    deviceId?: string | null
    rank?: number | null
  }
  prgRelease?: {
    id?: number | null
    deviceId?: string | null
    prgUrl?: string | null
    updatedAt?: Timestamp
  }
}

const isSameDevice = (deviceId: string | null | undefined, selectedDeviceId: string) => {
  return !!selectedDeviceId && deviceId === selectedDeviceId
}

const toTimestamp = (value: Timestamp) => {
  if (value === null || value === undefined || value === '') return null
  const timestamp = typeof value === 'number' ? value : Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

export const shouldShowBuildIqButton = (product?: PackagingState | null) => {
  if (!product) return false

  const rank = product.packagingLog?.rank
  return rank === null || rank === undefined
}

export const shouldShowBuildPrgButton = (
  product: PackagingState | null | undefined,
  designUpdatedAt: Timestamp,
  selectedDeviceId: string,
) => {
  if (!product || !selectedDeviceId) return false

  const designTimestamp = toTimestamp(designUpdatedAt)
  if (designTimestamp === null) return false

  const packagingLog = product.prgPackagingLog
  const isCurrentDeviceQueued = isSameDevice(packagingLog?.deviceId, selectedDeviceId)
    && packagingLog?.rank !== null
    && packagingLog?.rank !== undefined
  if (isCurrentDeviceQueued) return false

  const release = product.prgRelease
  if (!isSameDevice(release?.deviceId, selectedDeviceId)) return true

  const releaseTimestamp = toTimestamp(release?.updatedAt)
  return releaseTimestamp === null || releaseTimestamp < designTimestamp
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

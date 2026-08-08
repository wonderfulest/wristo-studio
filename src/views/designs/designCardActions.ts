type PackagingState = {
  packagingLog?: {
    rank?: number | null
  }
  prgRelease?: {
    id?: number | null
    prgUrl?: string | null
  }
}

export const shouldShowBuildIqButton = (product?: PackagingState | null) => {
  if (!product) return false

  const rank = product.packagingLog?.rank
  return rank === null || rank === undefined
}

export const shouldShowPreviewPrgButton = (product?: PackagingState | null) => {
  return !!product?.prgRelease?.id && !!product.prgRelease.prgUrl?.trim()
}

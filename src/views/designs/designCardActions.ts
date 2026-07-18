type PackagingState = {
  packagingLog?: {
    rank?: number | null
  }
}

export const shouldShowBuildIqButton = (product?: PackagingState | null) => {
  if (!product) return false

  const rank = product.packagingLog?.rank
  return rank === null || rank === undefined
}

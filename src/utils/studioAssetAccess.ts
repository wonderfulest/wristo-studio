export type SystemFlag = boolean | number | null | undefined

export const isSystemAsset = (asset: { isSystem?: SystemFlag } | null | undefined): boolean => {
  return asset?.isSystem === true || asset?.isSystem === 1
}

export const canUseAsset = (asset: { isSystem?: SystemFlag } | null | undefined, canUsePremiumAssets: boolean): boolean => {
  return canUsePremiumAssets || isSystemAsset(asset)
}

export const filterAssetsByStudioAccess = <T extends { isSystem?: SystemFlag }>(
  assets: T[],
  canUsePremiumAssets: boolean,
): T[] => {
  return canUsePremiumAssets ? assets : assets.filter(isSystemAsset)
}

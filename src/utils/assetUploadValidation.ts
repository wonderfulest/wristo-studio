import type { AnalogAssetType } from '@/types/api/analog-asset'

export const isSvgFile = (file: File): boolean => {
  const type = String(file.type || '').toLowerCase()
  const name = String(file.name || '').toLowerCase()
  return type === 'image/svg+xml' || name.endsWith('.svg')
}

export const isPngFile = (file: File): boolean => {
  const type = String(file.type || '').toLowerCase()
  const name = String(file.name || '').toLowerCase()
  return type === 'image/png' || name.endsWith('.png')
}

export const isHandAssetType = (assetType: AnalogAssetType): boolean => {
  return assetType === 'hour' || assetType === 'minute' || assetType === 'second'
}

export const isAllowedAnalogAssetFile = (file: File, assetType: AnalogAssetType): boolean => {
  const name = String(file.name || '').toLowerCase()
  const type = String(file.type || '').toLowerCase()
  if (assetType === 'image') {
    return /^(image\/svg\+xml|image\/png|image\/jpe?g|image\/webp)$/.test(type) || /\.(svg|png|jpe?g|webp)$/i.test(name)
  }
  if (isHandAssetType(assetType)) {
    return type === 'image/svg+xml' || type === 'image/png' || /\.(svg|png)$/i.test(name)
  }
  return name.endsWith('.svg') || type === 'image/svg+xml'
}

export const svgTextContainsRasterImage = (svgText: string): boolean => {
  if (!svgText) return false
  if (/<image\b/i.test(svgText)) return true
  if (/\b(?:href|xlink:href)\s*=\s*["']\s*data:image\//i.test(svgText)) return true
  return false
}

export const svgFileContainsRasterImage = async (file: File): Promise<boolean> => {
  if (!isSvgFile(file)) return false
  const svgText = await file.text()
  return svgTextContainsRasterImage(svgText)
}

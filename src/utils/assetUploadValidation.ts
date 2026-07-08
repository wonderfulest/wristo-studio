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
  return assetType === 'hour' || assetType === 'minute' || assetType === 'second' || assetType === 'center_cap'
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

const formatSvgDimension = (value: number): string => {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)))
}

export const ensureSvgFileHasIntrinsicSize = async (file: File): Promise<File> => {
  if (!isSvgFile(file)) return file

  const svgText = await file.text()
  if (!svgText.trim()) return file

  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  if (doc.querySelector('parsererror')) return file

  const svg = doc.documentElement
  if (!svg || svg.tagName.toLowerCase() !== 'svg') return file

  const hasWidth = Boolean(svg.getAttribute('width')?.trim())
  const hasHeight = Boolean(svg.getAttribute('height')?.trim())
  if (hasWidth && hasHeight) return file

  const viewBox = svg.getAttribute('viewBox')?.trim()
  if (!viewBox) return file

  const parts = viewBox.split(/[\s,]+/).map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return file

  const [, , width, height] = parts
  if (width <= 0 || height <= 0) return file

  if (!hasWidth) svg.setAttribute('width', formatSvgDimension(width))
  if (!hasHeight) svg.setAttribute('height', formatSvgDimension(height))

  const normalizedSvg = new XMLSerializer().serializeToString(svg)
  return new File([normalizedSvg], file.name, {
    type: file.type || 'image/svg+xml',
    lastModified: file.lastModified,
  })
}

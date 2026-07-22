import JSZip from 'jszip'
import { findImageByUrl } from '@/api/image'
import type { Image, ImageBase, ImageFormatSize } from '@/types/api/image'
import {
  enumerateMarketingVariantSources,
  inferMarketingImageFormat,
} from '@/engine/services/marketingAssetPlan.mjs'

export type ImageVariantManifest = {
  name: string
  path: string
  sourceUrl: string
  format: string
  mimeType: string
  sha256: string
  width?: number
  height?: number
}

type VariantSource = { name: string; value: ImageFormatSize }

const sha256Hex = async (blob: Blob): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const dimensionsFrom = async (blob: Blob, format: string): Promise<{ width?: number; height?: number }> => {
  if (format === 'png') {
    const bytes = new DataView(await blob.arrayBuffer())
    if (bytes.byteLength >= 24) return { width: bytes.getUint32(16), height: bytes.getUint32(20) }
  }
  if (format === 'svg') {
    const svg = await blob.text()
    const width = Number(svg.match(/\bwidth=["']([0-9.]+)/i)?.[1])
    const height = Number(svg.match(/\bheight=["']([0-9.]+)/i)?.[1])
    if (Number.isFinite(width) && Number.isFinite(height)) return { width, height }
  }
  return {}
}

export const resolveBackendImageRecord = async (source: string): Promise<Image | null> => {
  if (!source || /^(data|blob):/i.test(source)) return null
  try {
    const response = await findImageByUrl(source)
    return response?.data?.id && response.data.url ? response.data : null
  } catch (error: any) {
    if (Number(error?.response?.status) === 404) return null
    throw new Error(`Failed to resolve backend image record for ${source}: ${error?.message || 'request failed'}`)
  }
}

export const enumerateImageVariants = (image: ImageBase): VariantSource[] => {
  return enumerateMarketingVariantSources(image) as VariantSource[]
}

export const writeImageVariants = async (
  zip: JSZip,
  input: { imageId: number | string; basePath: string; image: ImageBase },
): Promise<ImageVariantManifest[]> => {
  const result: ImageVariantManifest[] = []
  for (const variant of enumerateImageVariants(input.image)) {
    const response = await fetch(variant.value.url)
    if (!response.ok) {
      throw new Error(`Failed to download image ${input.imageId} variant ${variant.name}`)
    }
    const blob = await response.blob()
    const format = inferMarketingImageFormat(blob.type, variant.value.url)
    const path = `${input.basePath}/${variant.name}.${format}`
    zip.file(path, await blob.arrayBuffer())
    const actualDimensions = await dimensionsFrom(blob, format)
    result.push({
      name: variant.name,
      path,
      sourceUrl: variant.value.url,
      format,
      mimeType: blob.type || variant.value.mime || 'application/octet-stream',
      sha256: await sha256Hex(blob),
      width: actualDimensions.width || variant.value.width,
      height: actualDimensions.height || variant.value.height,
    })
  }
  return result
}

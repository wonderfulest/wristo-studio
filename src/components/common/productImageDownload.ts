import JSZip from 'jszip'
import type { ImageFormatSize } from '@/types/api/image'
import type { ProductImageItem } from '@/types/product'

export type ProductImageDownloadMode = 'thumbnail' | 'original' | 'all'

export interface ProductImageDownloadEntry {
  url: string
  path: string
}

export interface ProductImageArchiveResult {
  blob: Blob | null
  downloaded: number
  failed: number
}

const extensionFrom = (url: string, mime = ''): string => {
  const pathname = new URL(url, 'http://localhost').pathname
  const extension = pathname.match(/\.([a-z0-9]+)$/i)?.[1]
  if (extension) return extension.toLowerCase()
  return mime.split('/')[1]?.replace('jpeg', 'jpg') || 'bin'
}

const normalizedFolder = (item: ProductImageItem): 'product' | 'social' =>
  item.type === 'product' ? 'product' : 'social'

const originalSource = (item: ProductImageItem): ImageFormatSize | null => {
  const url = item.downloadUrl || item.image?.url || item.imageUrl
  return url ? { url, mime: item.image?.mime } : null
}

const thumbnailSource = (item: ProductImageItem): ImageFormatSize | null => {
  const thumbnail = item.image?.formats?.thumbnail
  if (thumbnail?.url) return thumbnail
  const url = item.previewUrl || item.image?.previewUrl || item.imageUrl
  return url ? { url } : null
}

export const createProductImageDownloadEntries = (
  items: ProductImageItem[],
  mode: ProductImageDownloadMode,
): ProductImageDownloadEntry[] => {
  return items.flatMap((item, index) => {
    const folder = normalizedFolder(item)
    const prefix = `${String(index + 1).padStart(2, '0')}-${item.id}`
    const sources: Array<[string, ImageFormatSize]> = []

    if (mode === 'thumbnail') {
      const source = thumbnailSource(item)
      if (source) sources.push(['thumbnail', source])
    } else {
      const source = originalSource(item)
      if (source) sources.push(['original', source])
      if (mode === 'all') {
        for (const [name, value] of Object.entries(item.image?.formats || {})) {
          if (value?.url) sources.push([name, value])
        }
      }
    }

    const seenUrls = new Set<string>()
    return sources.flatMap(([name, source]) => {
      if (seenUrls.has(source.url)) return []
      seenUrls.add(source.url)
      const extension = extensionFrom(source.url, source.mime)
      const path = mode === 'all'
        ? `${folder}/${prefix}/${name}.${extension}`
        : `${folder}/${prefix}-${name}.${extension}`
      return [{ url: source.url, path }]
    })
  })
}

export const buildProductImageArchive = async (
  items: ProductImageItem[],
  mode: ProductImageDownloadMode,
): Promise<ProductImageArchiveResult> => {
  const zip = new JSZip()
  const entries = createProductImageDownloadEntries(items, mode)
  let downloaded = 0
  let failed = items.filter(
    (item) => createProductImageDownloadEntries([item], mode).length === 0,
  ).length

  for (const entry of entries) {
    try {
      const response = await fetch(entry.url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      zip.file(entry.path, await response.arrayBuffer())
      downloaded += 1
    } catch {
      failed += 1
    }
  }

  return {
    blob: downloaded > 0 ? await zip.generateAsync({ type: 'blob' }) : null,
    downloaded,
    failed,
  }
}

export const saveProductImageArchive = (blob: Blob, appId: number): void => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${appId}-product-images.zip`
  anchor.click()
  URL.revokeObjectURL(url)
}

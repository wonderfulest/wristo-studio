import type { ProductImageItem, ProductImageSelectionDto, ProductImageType } from '@/types/product'

export const PRODUCT_IMAGE_LIMIT = 20

const normalizeType = (value: unknown): ProductImageType => {
  return value === 'social' || value === 'share' ? value : 'product'
}

export const normalizeProductImage = (input: any): ProductImageItem | null => {
  if (!input) return null
  const imageId = Number(input.imageId ?? input.image?.id ?? input.id ?? 0)
  const image = input.image
  const previewUrl = input.previewUrl || image?.formats?.thumbnail?.url || image?.previewUrl
  const imageUrl = previewUrl || input.imageUrl || image?.url || input.downloadUrl
  if (!Number.isFinite(imageId) || imageId <= 0 || !imageUrl) return null
  return {
    id: imageId,
    relationId: input.imageId ? Number(input.id) || undefined : input.relationId,
    type: normalizeType(input.type),
    imageUrl,
    previewUrl,
    downloadUrl: input.downloadUrl || image?.url,
    image,
  }
}

export const groupProductImages = (items: ProductImageItem[]) => ({
  product: items.filter((item) => item.type === 'product'),
  social: items.filter((item) => item.type === 'social' || item.type === 'share'),
})

export const remainingProductImageSlots = (items: ProductImageItem[]): number => {
  return Math.max(0, PRODUCT_IMAGE_LIMIT - items.length)
}

export const replaceProductImageGroup = (
  items: ProductImageItem[],
  group: 'product' | 'social',
  replacements: ProductImageItem[],
): ProductImageItem[] => {
  const belongsToGroup = (item: ProductImageItem) => group === 'product'
    ? item.type === 'product'
    : item.type === 'social' || item.type === 'share'
  const firstGroupIndex = items.findIndex(belongsToGroup)
  const retained = items.filter((item) => !belongsToGroup(item))
  const insertAt = firstGroupIndex < 0 ? retained.length : Math.min(firstGroupIndex, retained.length)
  return [...retained.slice(0, insertAt), ...replacements, ...retained.slice(insertAt)]
    .slice(0, PRODUCT_IMAGE_LIMIT)
}

export const toProductImageSelections = (items: ProductImageItem[]): ProductImageSelectionDto[] => {
  return items.slice(0, PRODUCT_IMAGE_LIMIT).map((item, sortOrder) => ({
    imageId: item.id,
    type: item.type === 'product' ? 'product' : 'social',
    sortOrder,
  }))
}

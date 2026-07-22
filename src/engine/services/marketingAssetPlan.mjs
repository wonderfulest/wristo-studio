const sanitize = (value, fallback) => String(value || fallback)
  .replace(/\.[^.]+$/, '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9._-]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80) || fallback

export const createMarketingAssetInputs = (product = {}) => ({
  scalars: [
    { type: 'hero', source: product.garminImageUrl || product.heroImageUrl || null },
    { type: 'raw', source: product.rawImageUrl || null },
    { type: 'banner', source: product.bannerImageUrl || null },
  ],
  gallery: Array.isArray(product.productImages) ? product.productImages : [],
})

export const createScalarMarketingAssetPlan = (input, resolvedRecord = null) => {
  const source = String(input?.source || '').trim()
  if (!source) return null
  const image = resolvedRecord?.id && resolvedRecord?.url ? resolvedRecord : { url: source }
  return {
    imageId: resolvedRecord?.id || input.type,
    type: 'product',
    name: input.type,
    basePath: `marketing/${input.type}`,
    image,
  }
}

export const createGalleryMarketingAssetPlan = (item) => {
  const imageId = Number(item?.imageId ?? item?.image?.id ?? item?.id)
  if (!Number.isFinite(imageId) || imageId <= 0) {
    throw new Error(`Invalid product image id: ${String(item?.imageId ?? item?.id)}`)
  }
  const image = item.image || {
    id: imageId,
    url: item.downloadUrl || item.imageUrl,
    previewUrl: item.previewUrl,
    name: item.fileName || `image-${imageId}`,
  }
  if (!image.url) throw new Error(`Missing product image URL: ${imageId}`)
  const type = item.type === 'product' ? 'product' : 'social'
  const name = sanitize(item.name || image.name || `image-${imageId}`, `image-${imageId}`)
  return {
    imageId,
    relationId: item.relationId ?? (item.imageId ? item.id : undefined),
    type,
    sourceType: item.type || 'product',
    name,
    basePath: `marketing/${type}/${imageId}-${name}`,
    image,
  }
}

export const enumerateMarketingVariantSources = (image) => {
  const variants = [{
    name: 'original',
    value: { url: image.url, width: image.width, height: image.height, mime: image.mime },
  }]
  for (const [name, value] of Object.entries(image.formats || {})) {
    if (name !== 'original' && value?.url) variants.push({ name, value })
  }
  return variants
}

export const inferMarketingImageFormat = (mimeType, source, fallback = 'bin') => {
  const mime = String(mimeType || '').toLowerCase()
  if (mime.includes('png')) return 'png'
  if (mime.includes('jpeg')) return 'jpg'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('gif')) return 'gif'
  if (mime.includes('svg')) return 'svg'
  return String(source || '').split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || fallback
}

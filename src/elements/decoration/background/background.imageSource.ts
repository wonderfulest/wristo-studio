import { getImageById } from '@/api/image'

type BackgroundImageSource = {
  imageId?: number | string | null
  imageUrl?: string | null
}

const readImageId = (value: BackgroundImageSource['imageId']): number | null => {
  const imageId = typeof value === 'string' ? Number(value) : value
  return typeof imageId === 'number' && Number.isFinite(imageId) && imageId > 0 ? imageId : null
}

export async function resolveBackgroundImageSource(source: BackgroundImageSource): Promise<string> {
  const fallbackUrl = String(source.imageUrl || '').trim()
  const imageId = readImageId(source.imageId)
  if (!imageId) return fallbackUrl

  try {
    const response = await getImageById(imageId)
    const image = response.data
    return String(
      image?.url
      || image?.previewUrl
      || image?.formats?.large?.url
      || image?.formats?.medium?.url
      || image?.formats?.thumbnail?.url
      || fallbackUrl,
    ).trim()
  } catch (error) {
    console.warn(`[Background] failed to resolve imageId ${imageId}`, error)
    return fallbackUrl
  }
}

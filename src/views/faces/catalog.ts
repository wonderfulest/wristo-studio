export interface PublishedFace {
  appId: number
  designId?: string | null
  name: string
  price: number | null
  garminImageUrl?: string | null
  previewImageUrl?: string | null
  rawImageUrl?: string | null
  fallbackImageUrl?: string | null
  heroFile?: { url: string } | null
  garminStoreUrl?: string | null
  download?: number | null
  averageRating?: number | null
  ratingCount?: number | null
}
export interface FacePage {
  list: PublishedFace[]
  total: number
  pages: number
}
export interface FaceDevice {
  id: number
  deviceId: string
  displayName: string
}
export interface FaceDetail extends PublishedFace {
  ownerId?: number
  publiclyVisible?: boolean
  allowRemix?: boolean
  configJson?: unknown
  dataFieldCatalog?: unknown
  description?: string | null
  user?: { nickname?: string | null; username?: string | null; avatar?: string | null } | null
  createdAt?: string | null
  updatedAt?: string | null
  devices?: FaceDevice[] | null
  tags?: Array<{ id: number; name: string }> | null
  productImages?: Array<{
    id: number
    type?: string
    downloadUrl?: string | null
    imageUrl?: string | null
    previewUrl?: string | null
    altText?: string | null
    sortOrder?: number | null
    isActive?: number
  }> | null
}
export interface FaceQuery {
  keyword: string
  device: string
  sort: string
  page: number
}

// Public catalog requests must never start Studio's authentication redirect flow.
async function publicGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const response = await fetch(`/wristo-api/public/products/${path}?${new URLSearchParams(params)}`, { credentials: 'omit' })
  if (!response.ok) throw new Error('The face catalog is unavailable. Please try again.')
  const body = await response.json()
  if ('code' in body) {
    if (body.code !== 0) throw new Error('The face catalog is unavailable. Please try again.')
    return body.data
  }
  return body
}
export function loadFaces(query: FaceQuery): Promise<FacePage> {
  const params: Record<string, string> = { pageNum: String(query.page), pageSize: '25', lang: 'en' }
  if (query.device) params.device = query.device
  if (query.keyword.trim()) {
    params.keyword = query.keyword.trim()
    return publicGet('faces', { ...params, orderBy: query.sort })
  }
  return publicGet('faces', { ...params, orderBy: query.sort })
}
export const loadFaceDevices = () => publicGet<FaceDevice[]>('garmin-devices/list', {})
export const faceImage = (face: PublishedFace) => face.garminImageUrl || face.previewImageUrl || face.heroFile?.url || face.rawImageUrl || face.fallbackImageUrl || ''
export function faceDetailsUrl(appId: number) {
  return `/faces/${appId}`
}
export async function loadFaceDetail(appId: string): Promise<FaceDetail> {
  if (!/^\d+$/.test(appId)) throw new Error('Watch face not found.')
  const face = await publicGet<FaceDetail | null>(`app/${appId}`, { populate: '*', lang: 'en' })
  if (!face?.appId) throw new Error('Watch face not found.')
  return face
}
export function faceDownloadUrl(face: PublishedFace): string | undefined {
  try {
    const url = new URL(face.garminStoreUrl || '')
    if (url.protocol === 'https:' && url.hostname === 'apps.garmin.com') return url.href
  } catch {
    /* Missing store links have no download action. */
  }
  return undefined
}

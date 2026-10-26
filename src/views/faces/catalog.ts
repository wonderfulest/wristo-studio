export interface PublishedFace {
  ownerId?: number
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
  publiclyVisible?: boolean
  copyEligible?: boolean
  allowRemix?: boolean
  configJson?: unknown
  dataFieldCatalog?: unknown
  description?: string | null
  descriptions?: Record<string, string> | null
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
  allowRemix?: boolean
  keyword: string
  device: string
  sort: string
  page: number
}

function catalogError(path: string, code?: number): Error {
  if (/^faces\/\d+$/.test(path)) {
    if (code === 403) return new Error('You do not have permission to view this watch face.')
    if (code === 404) return new Error('Watch face not found.')
  }
  return new Error('The face catalog is unavailable. Please try again.')
}

// Public catalog requests must never start Studio's authentication redirect flow.
async function publicGet<T>(path: string, params: Record<string, string>, token?: string): Promise<T> {
  const response = await fetch(`/wristo-api/public/products/${path}?${new URLSearchParams(params)}`, { credentials: 'omit', ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) })
  if (!response.ok) throw catalogError(path, response.status)
  const body = await response.json()
  if ('code' in body) {
    if (body.code !== 0) throw catalogError(path, body.code)
    return body.data
  }
  return body
}
export function loadFaces(query: FaceQuery): Promise<FacePage> {
  const params: Record<string, string> = { pageNum: String(query.page), pageSize: '25', lang: 'en' }
  if (query.allowRemix != null) params.allowRemix = String(query.allowRemix)
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
export async function loadFaceDetail(appId: string, token?: string): Promise<FaceDetail> {
  if (!/^\d+$/.test(appId)) throw new Error('Watch face not found.')
  const face = await publicGet<FaceDetail | null>(`faces/${appId}`, { populate: 'user,image,devices,configJson', lang: 'en' }, token)
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

export interface AuthorProfile {
  id: number
  name: string
  avatar?: string | null
  works: FacePage
}
export function loadAuthorProfile(id: string, page = 1): Promise<AuthorProfile> {
  if (!/^[1-9]\d*$/.test(id)) return Promise.reject(new Error('Author not found.'))
  return publicGet(`authors/${id}`, { pageNum: String(page), pageSize: '24' })
}

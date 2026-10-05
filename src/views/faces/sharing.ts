export type SocialPlatform = 'Facebook' | 'X' | 'Reddit'
import { faceDetailsUrl, faceImage, faceDownloadUrl, type FaceDetail } from './catalog'
import { supportedDataFields } from './dataFields'

export function faceShareUrl(origin: string, appId: number, code?: string, channel?: string): string {
  return withReferral(new URL(faceDetailsUrl(appId), origin).href, code, channel)
}

export function buildFaceShareLinks(url: string, title: string) {
  return [
    { label: 'X', href: `https://twitter.com/intent/tweet?${new URLSearchParams({ url, text: title })}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?${new URLSearchParams({ u: url })}` },
    { label: 'Reddit', href: `https://www.reddit.com/submit?${new URLSearchParams({ url, title })}` },
  ]
}

export function socialCaption(face: FaceDetail, code?: string, channel?: string): string {
  const preferred = [':FIELD_TYPE_STEPS', ':FIELD_TYPE_HEART_RATE', ':FIELD_TYPE_BATTERY', ':FIELD_TYPE_TEMPERATURE']
  const priority = (symbol: string) => preferred.includes(symbol) ? preferred.indexOf(symbol) : preferred.length
  const fields = supportedDataFields(face.dataFieldCatalog ?? face.configJson)
    .sort((a, b) => priority(a.symbol) - priority(b.symbol)).slice(0, 4).map(field => field.label)
  const author = face.user?.nickname || face.user?.username
  return [
    `⌚ ${face.name} — Garmin watch face`,
    fields.length ? `✨ Data options: ${fields.join(' • ')}` : 'Find a fresh look for your wrist.',
    author ? `Designed by ${author}` : '',
    `Explore: ${faceShareUrl('https://studio.wristo.io', face.appId, code, channel)}`,
    faceDownloadUrl(face) ? `Download on Connect IQ: ${faceDownloadUrl(face)}` : '',
    '#Garmin #WatchFace #Wristo',
  ].filter(Boolean).join('\n\n')
}

function safeImageUrl(value?: string | null): string {
  try { const url = new URL(value || ''); return url.protocol === 'https:' ? url.href : '' } catch { return '' }
}
export function socialImages(face: FaceDetail): Array<{ url: string; alt: string; promotional: boolean }> {
  const priority = (type?: string) => type === 'share' ? 0 : type === 'social' ? 1 : type === 'pinterest' ? 2 : 3
  const images = (face.productImages || []).filter(image => image.isActive !== 0)
    .slice().sort((a, b) => priority(a.type) - priority(b.type) || (a.sortOrder || 0) - (b.sortOrder || 0))
    .map(image => ({ url: safeImageUrl(image.downloadUrl || image.imageUrl), alt: image.altText || face.name, promotional: priority(image.type) < 3 }))
  if (!images.some(image => image.url)) images.push({ url: safeImageUrl(faceImage(face)), alt: face.name, promotional: false })
  return images.filter((image, index) => image.url && images.findIndex(other => other.url === image.url) === index)
}

export function facebookShareDialogUrl(appId: number, code?: string): string {
  return `https://www.facebook.com/sharer/sharer.php?${new URLSearchParams({ u: withReferral(`https://api.wristo.io/api/public/share/faces/${appId}`, code, 'Facebook') })}`
}

export async function downloadSocialImage(url: string, appId: number): Promise<void> {
  if (!safeImageUrl(url)) throw new Error('This image is unavailable.')
  const response = await fetch(url, { credentials: 'omit' })
  if (!response.ok) throw new Error('Could not download the image. Use Open original to save it instead.')
  const blob = await response.blob()
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type)) throw new Error('Unsupported image format. Use Open original instead.')
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = `wristo-${appId}-social.${blob.type === 'image/jpeg' ? 'jpg' : blob.type.split('/')[1]}`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

function withReferral(value: string, code?: string, channel?: string): string {
  const url = new URL(value)
  if (code && /^[A-Za-z0-9_-]{8,32}$/.test(code)) {
    url.searchParams.set('ref', code)
    if (channel) url.searchParams.set('via', channel)
  }
  return url.href
}

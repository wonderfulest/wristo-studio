const DEFAULT_BACKGROUND_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="transparent"/></svg>'
const LEGACY_DEFAULT_BACKGROUND_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#000000"/></svg>'

export const DEFAULT_BACKGROUND_IMAGE_URL = `data:image/svg+xml,${encodeURIComponent(DEFAULT_BACKGROUND_SVG)}`
export const DEFAULT_BACKGROUND_COLOR = '#000000'

const LEGACY_DEFAULT_BACKGROUND_IMAGE_URL = `data:image/svg+xml,${encodeURIComponent(LEGACY_DEFAULT_BACKGROUND_SVG)}`

export function normalizeBackgroundUrl(u: string): string {
  if (!u) return ''
  if (/^https?:\/\//.test(u) || u.startsWith('data:')) return u
  if (u.startsWith('@/')) return new URL(u, import.meta.url).href
  if (u.startsWith('/src/assets/')) return new URL(u.replace('/src/', '@/'), import.meta.url).href
  return u
}

export function resolveBackgroundUrl(raw: unknown): string {
  const url = normalizeBackgroundUrl(String(raw || ''))
  return url || DEFAULT_BACKGROUND_IMAGE_URL
}

export function isDefaultBackgroundUrl(raw: unknown): boolean {
  const url = resolveBackgroundUrl(raw)
  return url === DEFAULT_BACKGROUND_IMAGE_URL || url === LEGACY_DEFAULT_BACKGROUND_IMAGE_URL
}

export function isDefaultBackgroundElement(obj: unknown): boolean {
  const element = obj as { eleType?: unknown; wristoImageUrl?: unknown; imageUrl?: unknown; color?: unknown } | null | undefined
  const color = String(element?.color ?? DEFAULT_BACKGROUND_COLOR).toLowerCase()
  return String(element?.eleType ?? '') === 'background'
    && isDefaultBackgroundUrl(element?.wristoImageUrl ?? element?.imageUrl)
    && (color === DEFAULT_BACKGROUND_COLOR || color === '0x000000')
}

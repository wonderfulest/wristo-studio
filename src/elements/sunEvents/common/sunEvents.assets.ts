import type { SunEventIndicatorBase } from '@/types/elements/sunEvents'
import { normalizeSunEventIndicator } from './sunEvents.defaults'

export async function prepareSunEventIndicator<T extends Partial<SunEventIndicatorBase>>(indicator: T | null | undefined): Promise<T & SunEventIndicatorBase> {
  const normalized = normalizeSunEventIndicator(indicator)
  const source = normalized.imageSvg || normalized.imageUrl
  if (!source) return normalized
  const resolved = await resolveLegacySvgSource(source)
  return resolved === source ? normalized : { ...normalized, imageSvg: resolved, imageUrl: resolved }
}

// Older JSON saves uploaded charset-qualified SVGs as application/octet-stream .bin files.
const legacySvgSources = new Map<string, Promise<string>>()
export async function resolveLegacySvgSource(url: string): Promise<string> {
  if (!/\.bin(?:$|[?#])/i.test(url)) return url
  let pending = legacySvgSources.get(url)
  if (!pending) {
    pending = (async () => {
      const response = await fetch(url, { credentials: 'omit' })
      if (!response.ok) throw new Error(`Sun event indicator request failed (HTTP ${response.status})`)
      const svg = (await response.text()).trim()
      if (!/^(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(svg)) {
        throw new Error('Sun event indicator asset does not contain SVG data')
      }
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    })().catch(error => { legacySvgSources.delete(url); throw error })
    legacySvgSources.set(url, pending)
  }
  return pending
}


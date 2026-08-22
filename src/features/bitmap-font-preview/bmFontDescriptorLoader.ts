import { parseBmFontText, type BmFontDescriptor } from './bmFontTextParser'

const descriptorCache = new Map<string, Promise<BmFontDescriptor>>()

export const clearBmFontDescriptorCache = () => descriptorCache.clear()

export function loadBmFontDescriptor(url: string): Promise<BmFontDescriptor> {
  const cached = descriptorCache.get(url)
  if (cached) return cached

  const request = fetch(url, { credentials: 'omit' })
    .then(async response => {
      if (!response.ok) throw new Error(`BMFont descriptor request failed: ${response.status}`)
      return parseBmFontText(await response.text())
    })
    .catch(error => {
      descriptorCache.delete(url)
      throw error
    })
  descriptorCache.set(url, request)
  return request
}

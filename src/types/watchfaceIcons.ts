/** Images owned by one watchface, including unused assets. */
export interface WatchfaceIconAsset {
  id: string
  kind: 'custom' | 'override'
  name: string
  imageUrl: string
  fontSlug?: string
  unicode?: string
}

export function normalizeWatchfaceIcons(value: unknown): WatchfaceIconAsset[] {
  if (!Array.isArray(value)) return []
  const assets = new Map<string, WatchfaceIconAsset>()
  for (const item of value) {
    if (!item || typeof item.id !== 'string' || !item.id || !['custom', 'override'].includes(item.kind) || typeof item.name !== 'string' || typeof item.imageUrl !== 'string' || !item.imageUrl)
      continue
    if (item.kind === 'override' && (!item.fontSlug || !item.unicode)) continue
    assets.set(item.id, { id: item.id, kind: item.kind, name: item.name, imageUrl: item.imageUrl, ...(item.kind === 'override' ? { fontSlug: item.fontSlug, unicode: item.unicode } : {}) })
  }
  return [...assets.values()]
}

import { designTagKeywords } from './designTagSuggestions'
import type { ProductTag } from '@/types/api/productTag'

export const MAX_PRODUCT_TAGS = 20

export const filterEnabledProductTags = (items: ProductTag[]): ProductTag[] => items.filter((item) => item.status === 1)

export const restorePublishedTagIds = (options: ProductTag[], selectedIds: number[], limit = MAX_PRODUCT_TAGS): number[] => {
  const selected = new Set(selectedIds)
  return options
    .filter((option) => selected.has(option.id))
    .map((option) => option.id)
    .slice(0, limit)
}

export const validatePublishedTagIds = (value: unknown, limit = MAX_PRODUCT_TAGS): 'required' | 'invalid' | null => {
  if (!Array.isArray(value) || value.length === 0) return 'required'
  if (value.length > limit || value.some((id) => typeof id !== 'number' || !Number.isFinite(id)) || new Set(value).size !== value.length) {
    return 'invalid'
  }
  return null
}

const normalizeTag = (value: string): string => value.trim().replace(/^#/, '').toLocaleLowerCase()

export const matchPastedTags = (text: string, tags: ProductTag[]): number[] => {
  const names = new Set(
    text
      .split(/[,，;；\n]+/)
      .map(normalizeTag)
      .filter(Boolean)
  )
  return tags.filter((tag) => tag.status === 1 && (names.has(normalizeTag(tag.name)) || names.has(normalizeTag(tag.slug)))).map((tag) => tag.id)
}

export const suggestProductTags = (text: string, tags: ProductTag[], config?: unknown): number[] => {
  const source = text.toLocaleLowerCase()
  const features = new Set(designTagKeywords(config).split(', ').filter(Boolean))
  return tags
    .filter(
      (tag) =>
        tag.status === 1 &&
        (features.has(tag.slug.replace(/-/g, ' ')) || [tag.name, tag.slug.replace(/-/g, ' ')].some((value) => {
          const keyword = value.trim().toLocaleLowerCase()
          if (!keyword) return false
          const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'u').test(source)
        }))
    )
    .map((tag) => tag.id)
    .slice(0, MAX_PRODUCT_TAGS)
}

// General search terms only: do not randomly claim hardware support or features.
const commonSearchSlugs = new Set([
  'garmin', 'garmin-watch-face', 'watch-face', 'watchface', 'connect-iq',
  'smartwatch', 'wrist-watch', 'watch-face-design', 'watch-face-style',
  'daily', 'everyday', 'lifestyle', 'personal-style',
  'watch-collection', 'wrist-style', 'daily-look', 'watch-inspiration'
])

export const autoFillProductTags = (
  text: string, tags: ProductTag[], selectedIds: number[], config?: unknown,
  limit = MAX_PRODUCT_TAGS, random: () => number = Math.random, supportedDeviceIds = ''
): number[] => {
  const selected = new Set(selectedIds)
  const available = tags.filter((tag) => tag.status === 1 && !selected.has(tag.id))
  const devices = supportedDeviceIds.toLowerCase().split(',').map((id) => id.trim()).filter(Boolean)
  const families: Record<string, RegExp> = {
    fenix: /^fenix\d/, forerunner: /^(?:fr|forerunner)\d/, venu: /^venu(?:\d|sq)/,
    epix: /^epix(?:\d|gen|pro)/, instinct: /^instinct\d/, vivoactive: /^vivoactive\d/
  }
  const deviceMatches = available.filter((tag) => {
    const pattern = families[tag.slug]
    return tag.tagGroup === 'device' && devices.some((id) =>
      pattern ? pattern.test(id) : id === tag.slug.toLowerCase().replace(/[- ]/g, '')
    )
  }).map((tag) => tag.id)
  const matches = [...deviceMatches, ...suggestProductTags(text, available.filter((tag) => tag.tagGroup !== 'device'), config)]
  const matched = new Set(matches)
  const pool = available.filter((tag) => commonSearchSlugs.has(tag.slug) && !matched.has(tag.id)).map((tag) => tag.id)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return [...new Set([...matches, ...pool])].slice(0, Math.max(0, Math.min(8, limit - selected.size)))
}

export const tagDescriptionSuffix = (ids: number[], tags: ProductTag[]): string => {
  const seen = new Set<string>()
  return ids
    .map((id) => tags.find((tag) => tag.id === id)?.name.trim())
    .filter((name): name is string => {
      if (!name) return false
      const key = normalizeTag(name)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((name) => `#${name}`)
    .join(' ')
}

export const syncTagDescription = (description: string, previous: string, next: string): string => {
  let body = (description || '').trimEnd()
  // Remove only the exact paragraph managed by this form, preserving surrounding edits.
  if (previous) {
    body = body
      .split('\n\n')
      .filter((paragraph) => paragraph !== previous)
      .join('\n\n')
      .trimEnd()
  }
  // Older/generated descriptions may have reordered or Markdown-escaped tag
  // blocks. Rebuild the trailing blocks from the current selection each time.
  const lines = body.split(/\r?\n/)
  while (lines.length) {
    const last = lines[lines.length - 1].trim()
    if (last && !/^\\?#(?![#\s])/.test(last)) break
    lines.pop()
  }
  body = lines.join('\n').trimEnd()
  return [body, next].filter(Boolean).join('\n\n')
}

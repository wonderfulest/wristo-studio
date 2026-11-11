import { getFontBySlug } from '@/api/wristo/fonts'
import { canonicalFontSlug } from '@/features/bitmap-font-maker/fontSlug'
import { useFontStore } from '@/stores/fontStore'
import { packageFonts } from './packageAssetRegistry'
import { discardEmbeddedFontBuildFiles } from './jsonProject'

/** Resolve library references afresh on every design load; embedded fonts are a fallback. */
export async function resolveDesignFonts(config: unknown, isCurrent = () => true): Promise<void> {
  const slugs = new Set<string>()
  const fontFields = new Set(['fontFamily', 'iconFont', 'assetFontFamily', 'font', 'currentIconFontSlug'])
  const collect = (value: unknown): void => {
    if (!value || typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      // Metadata and embedded files are fallback resources, not additional references.
      if (key === 'studioResources') continue
      if (fontFields.has(key) && typeof child === 'string' && child.trim()) {
        slugs.add(canonicalFontSlug(child))
      } else collect(child)
    }
  }
  collect(config)
  const resolved = await Promise.all([...slugs].map(async slug => {
    try {
      const response = await getFontBySlug(slug, { allowMissing: true })
      return { slug, font: response.data }
    } catch (error: any) {
      // A lookup failure must not silently pin the design to an obsolete font.
      if (Number(error?.response?.status ?? error?.code) !== 404) throw error
      return { slug, font: undefined }
    }
  }))
  if (!isCurrent()) return
  const store = useFontStore()
  for (const { slug, font } of resolved) {
    if (font) {
      const current = store.registerServerFont(font)
      packageFonts.set(slug, current)
      discardEmbeddedFontBuildFiles(slug)
    } else {
      store.serverFonts.delete(slug)
      const embedded = packageFonts.get(slug)
      if (embedded) store.registerServerFont(embedded)
    }
  }
}

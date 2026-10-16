import { getFontBySlug, uploadFontFile } from '@/api/wristo/fonts'
import type { DesignFontVO } from '@/types/font'
import { canonicalFontSlug } from '@/features/bitmap-font-maker/fontSlug'
import { packageFonts, packageFontBuildFiles } from './packageAssetRegistry'

/** Persist packaged source fonts before applying the canvas; local cache is not server existence. */
export async function importPackageFonts(config: unknown, isCurrent = () => true): Promise<void> {
  const replacements = new Map<string, DesignFontVO>()
  const checkCurrent = () => {
    if (!isCurrent()) throw new Error('WRT import cancelled')
  }
  for (const [slug, sourceFont] of Array.from(packageFonts)) {
    // Older WRT archives used `icon`; the upload API accepts `icon_font`.
    const packaged = sourceFont.type === 'icon' ? { ...sourceFont, type: 'icon_font' } : sourceFont
    checkCurrent()
    let remote: DesignFontVO | undefined
    try {
      remote = (await getFontBySlug(slug)).data
    } catch (error: any) {
      if (Number(error?.code ?? error?.response?.status) !== 404) throw error
    }
    checkCurrent()
    if (!remote) {
      const url = packaged.ttfFile?.url
      if (!url) throw new Error(`Missing source file for font: ${slug}`)
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Unable to read packaged font: ${slug}`)
      const blob = await response.blob()
      checkCurrent()
      const extension = /\.otf(?:$|[?#])/i.test(packaged.ttfFile.name || url) ? 'otf' : 'ttf'
      remote = (await uploadFontFile(
        new File([blob], `${slug}.${extension}`, { type: blob.type }),
        packaged.type || 'text_font',
        packaged.language,
      )).data
    }
    if (!remote?.slug || !remote.ttfFile?.url) throw new Error(`Font registration failed: ${slug}`)
    replacements.set(slug, { ...packaged, ...remote })
  }
  const builds = new Map<string, Map<string, Blob>>()
  for (const [slug, font] of replacements) {
    const files = packageFontBuildFiles.get(slug)
    if (!files || slug === font.slug) continue
    const renamed = new Map<string, Blob>()
    for (const [path, blob] of files) {
      renamed.set(path.split(slug).join(font.slug), path.endsWith('.fnt')
        ? new Blob([(await blob.text()).split(slug).join(font.slug)], { type: blob.type }) : blob)
    }
    builds.set(font.slug, renamed)
  }
  checkCurrent()
  const fields = new Set(['fontFamily', 'iconFont', 'assetFontFamily'])
  const visit = (value: any) => {
    if (!value || typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      if (fields.has(key) && typeof child === 'string') {
        const replacement = replacements.get(canonicalFontSlug(child))
        if (replacement) value[key] = replacement.slug
      } else visit(child)
    }
  }
  visit(config)
  for (const [slug, font] of replacements) {
    if (slug !== font.slug) packageFontBuildFiles.delete(slug)
    packageFonts.delete(slug)
    packageFonts.set(canonicalFontSlug(font.slug), font)
  }
  for (const [slug, files] of builds) packageFontBuildFiles.set(slug, files)
}

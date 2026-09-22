import JSZip from 'jszip'
import { completeIconBuild, iconFontCoverage } from './wrtIconCoverage'
import { BitmapFontWorkerClient } from '@/features/bitmap-font-maker/workerClient'
import { sha256Hex } from '@/features/bitmap-font-maker/deterministicEncoding'

export interface WrtSourceFont {
  slug: string
  path?: string
  metadata?: Record<string, unknown>
  buildPath?: string
  buildFiles?: Array<{ path: string; sha256: string }>
}

/** Enrich the verified archive before touching the active project's font registry. */
export interface WrtFontBuildProgress {
  fraction: number
  fontSlug: string
  fontIndex: number
  fontTotal: number
  fontSize?: number
}

export async function buildMissingWrtFonts(zip: JSZip, fonts: WrtSourceFont[], onProgress?: (progress: WrtFontBuildProgress) => void, config?: unknown) {
  const missing = fonts.filter(font => !font.buildFiles?.some(file => file.path.endsWith('.fnt')) && font.path && /\.(ttf|otf)$/i.test(font.path))
  for (const font of fonts) {
    const coverage = await iconFontCoverage(zip, font, config)
    if (coverage?.incomplete.length && !missing.includes(font)) missing.push(font)
  }
  if (!missing.length) return []
  const worker = new BitmapFontWorkerClient()
  const refs: Array<{ id: string; category: string; path: string; format: string; mimeType: string; sourceRef: string; sha256: string }> = []
  try {
    for (const [index, font] of missing.entries()) {
      const report = (fraction: number, fontSize?: number) => onProgress?.({
        fraction: (index + fraction) / missing.length, fontSlug: font.slug,
        fontIndex: index + 1, fontTotal: missing.length, fontSize,
      })
      report(0)
      if (!/^[a-zA-Z0-9_-]+$/.test(font.slug)) throw new Error(`Invalid font slug: ${font.slug}`)
      const source = zip.file(font.path!)
      if (!source) throw new Error(`Missing font source: ${font.slug}`)
      const iconCoverage = await iconFontCoverage(zip, font, config)
      const artifact = await worker.build({
        source: await source.async('arraybuffer'), fileName: font.path!.split('/').pop()!,
        slug: font.slug, fontType: 'text_font', preserveSource: true,
        recipe: { schemaVersion: 1, rendererVersion: '1', fontWeight: 400, italicAngle: 0,
          outlineWidthEm: 0, outlineMode: 'fill', lineJoin: 'round', antialias: true },
      }, progress => report(0.95 * progress.completed / progress.total, progress.size)).result
      const generated = await JSZip.loadAsync(artifact.zip)
      if (iconCoverage) await completeIconBuild(generated)
      const buildPath = `fonts/bitmaps/${font.slug}`
      const buildFiles = []
      for (const entry of Object.values(generated.files)) {
        if (entry.dir) continue
        const path = `${buildPath}/${entry.name}`
        const bytes = await entry.async('uint8array')
        zip.file(path, bytes)
        buildFiles.push({ path, sha256: await sha256Hex(bytes) })
      }
      const metadata = { ...font.metadata, slug: font.slug, fullName: font.metadata?.fullName || font.slug,
        type: font.metadata?.type || (iconCoverage ? 'icon_font' : 'text_font'), language: font.metadata?.language || 'en',
        bitmapPreviewSize: 30, bitmapCanvasPreviewSize: 312 } as Record<string, unknown>
      for (const [prefix, size] of [['bitmapPreview', 30], ['bitmapCanvasPreview', 312]] as const) {
        for (const [suffix, extension, mimeType] of [['DescriptorUrl', 'fnt', 'text/plain'], ['AtlasUrl', 'png', 'image/png']] as const) {
          const path = `${buildPath}/${size}/${font.slug}-g${extension === 'png' ? '_0' : ''}.${extension}`
          const file = buildFiles.find(file => file.path === path)
          if (!file) throw new Error(`Missing generated font preview: ${font.slug}`)
          metadata[`${prefix}${suffix}`] = `bundle://${path}`
          refs.push({ id: `font-${font.slug}-${prefix}-${suffix}`, category: 'fonts', ...file,
            format: extension, mimeType, sourceRef: `bundle://${path}` })
        }
      }
      // Keep nonstandard sizes; verify them too instead of silently dropping them.
      for (const existing of font.buildFiles || []) {
        if (!buildFiles.some(file => file.path === existing.path)) buildFiles.push(existing)
      }
      Object.assign(font, { metadata, buildPath, buildFiles })
      const coverage = await iconFontCoverage(zip, font, config)
      if (coverage?.incomplete.length) throw new Error(`Missing WRT icon glyphs after build: ${font.slug}: ${coverage.incomplete.join(', ')}`)
      report(1)
    }
    return refs
  } finally {
    worker.dispose()
  }
}

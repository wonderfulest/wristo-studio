import type JSZip from 'jszip'
import { parseFontSource } from '@/features/bitmap-font-maker/fontSource'
import type { WrtSourceFont } from './wrtFontBuild'

// DataProvider uses these glyphs at runtime, regardless of the catalog preview.
const runtimeIcons: Record<string, number[]> = {
  BATTERY: [0x26, 0x27, 0x28, 0x29, 0x2a],
  DAYLY_ACTIVE_MINUTES: [0x40],
  WEEKLY_ACTIVE_MINUTES: [0x40],
  WEEKLY_RUN_DISTANCE: [0x46],
  PRECIPITATION_CHANCE_CURRENT: [0x67],
  PRECIPITATION_CHANCE_NEXT_HOUR: [0x67],
  PRECIPITATION_CHANCE_TODAY: [0x67],
}

export function requiredIconGlyphs(config: any, slug: string): Set<number> {
  const required = new Set<number>()
  for (const element of config?.elements || []) {
    if (element.eleType !== 'icon' || element.iconDisplayType === 'amoled'
      || (element.fontFamily || element.iconFont) !== slug) continue
    const property = config.properties?.[element.dataProperty]
    const symbols = [element.metricSymbol, property?.value, ...(property?.metricSymbols || []),
      ...(property?.options || []).map((option: any) => option.metricSymbol || option.value)]
    for (const symbol of symbols) {
      if (typeof symbol !== 'string') continue
      const key = symbol.replace(/^:(?:FIELD|GOAL)_TYPE_/, '')
      for (const code of runtimeIcons[key] || []) required.add(code)
      const icon = config.dataOptions?.[symbol]?.iconUnicode
      if (typeof icon === 'string' && /^[0-9a-f]{1,6}$/i.test(icon)) required.add(parseInt(icon, 16))
    }
  }
  return required
}

export async function iconFontCoverage(zip: JSZip, font: WrtSourceFont, config?: unknown) {
  const required = requiredIconGlyphs(config, font.slug)
  const isIcon = font.metadata?.type === 'icon_font' || required.size > 0
    || (config as any)?.elements?.some((e: any) => e.eleType === 'icon' && e.iconDisplayType !== 'amoled' && (e.fontFamily || e.iconFont) === font.slug)
  if (!isIcon) return null
  const source = font.path && zip.file(font.path)
  if (source) {
    const parsed = await parseFontSource(new File([await source.async('arraybuffer')], font.path!.split('/').pop()!))
    for (const code of parsed.supportedCodepoints) {
      const character = String.fromCodePoint(code)
      if (!/[\p{Cc}\p{Cf}]/u.test(character) && parsed.font.charToGlyph(character).path.commands.length) required.add(code)
    }
  }
  const incomplete: string[] = []
  for (const file of font.buildFiles || []) {
    if (!file.path.endsWith('.fnt')) continue
    const text = await zip.file(file.path)?.async('string') || ''
    const codes = new Set([...text.matchAll(/^char\s+id=(\d+)\b/gm)].map(match => Number(match[1])))
    if ([...required].some(code => !codes.has(code))) incomplete.push(file.path)
  }
  if (incomplete.length && !source) throw new Error(`Missing WRT icon glyphs: ${font.slug}; embedded source font required to repair ${incomplete.join(', ')}`)
  return { required, incomplete }
}

/** Wonderful uses U+110D for rain probability; the runtime requests U+0067. */
export function addIconGlyphAliases(descriptor: string): string {
  if (/^char\s+id=103\b/m.test(descriptor)) return descriptor
  const rain = descriptor.match(/^char\s+id=4365\b[^\r\n]*/m)?.[0]
  if (!rain) return descriptor
  const result = descriptor.trimEnd() + '\n' + rain.replace(/id=4365\b/, 'id=103') + '\n'
  return result.replace(/^chars count=\d+/m, `chars count=${[...result.matchAll(/^char\s+id=/gm)].length}`)
}

/** Keep the nested font package self-consistent after adding runtime aliases. */
export async function completeIconBuild(zip: JSZip): Promise<void> {
  const { canonicalJson, sha256Hex } = await import('@/features/bitmap-font-maker/deterministicEncoding')
  let addedRain = false
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || !entry.name.endsWith('.fnt')) continue
    const original = await entry.async('string')
    const completed = addIconGlyphAliases(original)
    if (completed !== original) { zip.file(entry.name, completed); addedRain = true }
  }
  const layoutFile = zip.file('connectiq-layout.json')
  if (addedRain && layoutFile) {
    const layout = JSON.parse(await layoutFile.async('string'))
    for (const size of Object.values(layout.sizes || {}) as any[]) {
      if (size.glyphs?.['4365'] && !size.glyphs['103']) size.glyphs['103'] = { ...size.glyphs['4365'] }
    }
    zip.file('connectiq-layout.json', canonicalJson(layout))
  }
  const manifestFile = zip.file('manifest.json')
  if (manifestFile) {
    const manifest = JSON.parse(await manifestFile.async('string'))
    manifest.type = 'icon_font'
    if (addedRain && manifest.charset?.codepoints && !manifest.charset.codepoints.includes(103)) {
      manifest.charset.codepoints.push(103)
      manifest.charset.codepoints.sort((a: number, b: number) => a - b)
    }
    const hashes: string[] = []
    for (const path of Object.keys(zip.files).filter(path => !zip.files[path].dir && path !== 'manifest.json').sort()) {
      hashes.push(`${path}\0${await sha256Hex(await zip.files[path].async('uint8array'))}\n`)
    }
    manifest.packageContentSha256 = await sha256Hex(new TextEncoder().encode(hashes.join('')))
    zip.file('manifest.json', canonicalJson(manifest))
  }
}

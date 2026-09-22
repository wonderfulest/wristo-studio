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

// Wonderful uses U+110D for rain probability. Legacy Wristo packages use
// U+0063 for pressure, while the sensor-pressure catalog requests U+0068.
function iconGlyphAliases(legacyPressureAlias: boolean): Array<[number, number]> {
  return legacyPressureAlias ? [[103, 4365], [104, 99]] : [[103, 4365]]
}
export function addIconGlyphAliases(descriptor: string, legacyPressureAlias = false): string {
  let result = descriptor
  for (const [target, source] of iconGlyphAliases(legacyPressureAlias)) {
    if (new RegExp(`^char\\s+id=${target}\\b`, 'm').test(result)) continue
    const original = result.match(new RegExp(`^char\\s+id=${source}\\b[^\\r\\n]*`, 'm'))?.[0]
    if (!original) continue
    result = result.trimEnd() + '\n' + original.replace(new RegExp(`id=${source}\\b`), `id=${target}`) + '\n'
  }
  if (result === descriptor) return descriptor
  return result.replace(/^chars count=\d+/m, `chars count=${[...result.matchAll(/^char\s+id=/gm)].length}`)
}

/** Keep the nested font package self-consistent after adding runtime aliases. */
export async function completeIconBuild(zip: JSZip, legacyPressureAlias = false): Promise<void> {
  const { canonicalJson, sha256Hex } = await import('@/features/bitmap-font-maker/deterministicEncoding')
  const addedAliases = new Set<number>()
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || !entry.name.endsWith('.fnt')) continue
    const original = await entry.async('string')
    const completed = addIconGlyphAliases(original, legacyPressureAlias)
    if (completed !== original) {
      zip.file(entry.name, completed)
      for (const [target] of iconGlyphAliases(legacyPressureAlias)) {
        if (!new RegExp(`^char\\s+id=${target}\\b`, 'm').test(original)
          && new RegExp(`^char\\s+id=${target}\\b`, 'm').test(completed)) addedAliases.add(target)
      }
    }
  }
  const layoutFile = zip.file('connectiq-layout.json')
  if (addedAliases.size && layoutFile) {
    const layout = JSON.parse(await layoutFile.async('string'))
    for (const size of Object.values(layout.sizes || {}) as any[]) {
      for (const [target, source] of iconGlyphAliases(legacyPressureAlias)) {
        if (addedAliases.has(target) && size.glyphs?.[source] && !size.glyphs[target]) {
          size.glyphs[target] = { ...size.glyphs[source] }
        }
      }
    }
    zip.file('connectiq-layout.json', canonicalJson(layout))
  }
  const manifestFile = zip.file('manifest.json')
  if (manifestFile) {
    const manifest = JSON.parse(await manifestFile.async('string'))
    manifest.type = 'icon_font'
    if (addedAliases.size && manifest.charset?.codepoints) {
      for (const target of addedAliases) {
        if (!manifest.charset.codepoints.includes(target)) manifest.charset.codepoints.push(target)
      }
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

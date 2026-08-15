import JSZip from 'jszip'
import type { BitmapFontManifest } from '@/features/bitmap-font-maker/contracts'
import { canonicalJson, sha256Hex } from '@/features/bitmap-font-maker/packageBuilder'

const ZIP_ENTRY_DATE = new Date(Date.UTC(1980, 0, 1))

function utf8Compare(left: string, right: string): number {
  const a = new TextEncoder().encode(left)
  const b = new TextEncoder().encode(right)
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index]
  }
  return a.length - b.length
}

function renameDescriptorPage(text: string, oldSlug: string, nextSlug: string): string {
  const pageLines = [...text.matchAll(/^page\s+.*$/gm)]
  if (pageLines.length !== 1) throw new Error('FNT_PAGE_INVALID')
  const line = pageLines[0][0]
  const parsed = /^page\s+id=0\s+file="([^"]+)"\s*$/.exec(line)
  if (!parsed || parsed[1] !== `${oldSlug}-g_0.png`) throw new Error('FNT_PAGE_INVALID')
  const renamed = line.replace(`file="${oldSlug}-g_0.png"`, `file="${nextSlug}-g_0.png"`)
  return text.slice(0, pageLines[0].index) + renamed + text.slice(pageLines[0].index! + line.length)
}

export async function repackageBitmapFontSlug(
  bytes: ArrayBuffer,
  manifest: BitmapFontManifest,
  nextSlug: string,
): Promise<{ zip: ArrayBuffer; manifest: BitmapFontManifest }> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSlug)) throw new Error('SLUG_INVALID')
  if (manifest.slug === nextSlug) return { zip: bytes.slice(0), manifest }
  const input = await JSZip.loadAsync(bytes)
  const output = new JSZip()
  const hashes = new Map<string, string>()
  const oldSlug = manifest.slug
  const extension = /\.otf$/i.test(manifest.source.fileName) ? 'otf' : /\.ttf$/i.test(manifest.source.fileName) ? 'ttf' : null
  if (!extension) throw new Error('SOURCE_EXTENSION_INVALID')

  for (const [path, entry] of Object.entries(input.files)) {
    if (entry.dir || path === 'manifest.json') continue
    let nextPath = path
    if (path === manifest.source.fileName) nextPath = `${nextSlug}.${extension}`
    else if (path !== 'recipe.json') {
      const escaped = oldSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const match = new RegExp(`^(\\d+)/${escaped}(-g_0\\.png|-g\\.fnt)$`).exec(path)
      if (!match) throw new Error('PACKAGE_PATH_INVALID')
      nextPath = `${match[1]}/${nextSlug}${match[2]}`
    }
    let material = await entry.async('uint8array')
    if (path.endsWith('.fnt')) {
      const text = renameDescriptorPage(new TextDecoder().decode(material), oldSlug, nextSlug)
      material = new TextEncoder().encode(text)
    }
    output.file(nextPath, material, {
      date: ZIP_ENTRY_DATE,
      createFolders: false,
      compression: nextPath.endsWith('.png') ? 'STORE' : 'DEFLATE',
    })
    hashes.set(nextPath, await sha256Hex(material))
  }

  const contentMaterial = [...hashes]
    .sort(([left], [right]) => utf8Compare(left, right))
    .map(([path, hash]) => `${path}\0${hash.toLowerCase()}\n`)
    .join('')
  const nextManifest: BitmapFontManifest = {
    ...manifest,
    slug: nextSlug,
    source: { ...manifest.source, fileName: `${nextSlug}.${extension}` },
    packageContentSha256: await sha256Hex(new TextEncoder().encode(contentMaterial)),
  }
  output.file('manifest.json', canonicalJson(nextManifest), {
    date: ZIP_ENTRY_DATE,
    createFolders: false,
    compression: 'DEFLATE',
  })
  return {
    zip: await output.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' }),
    manifest: nextManifest,
  }
}

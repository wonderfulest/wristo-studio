import JSZip from 'jszip'
import type { BitmapFontManifest } from '@/features/bitmap-font-maker/contracts'
import { canonicalJson, sha256Hex } from '@/features/bitmap-font-maker/packageBuilder'

const ZIP_ENTRY_DATE = new Date(Date.UTC(1980, 0, 1))

export async function repackageBitmapFontSlug(
  bytes: ArrayBuffer,
  manifest: BitmapFontManifest,
  nextSlug: string,
): Promise<{ zip: ArrayBuffer; manifest: BitmapFontManifest }> {
  if (manifest.slug === nextSlug) return { zip: bytes.slice(0), manifest }
  const input = await JSZip.loadAsync(bytes)
  const output = new JSZip()
  const hashes = new Map<string, string>()
  const oldSlug = manifest.slug

  for (const [path, entry] of Object.entries(input.files)) {
    if (entry.dir || path === 'manifest.json') continue
    let nextPath = path.split(oldSlug).join(nextSlug)
    let material = await entry.async('uint8array')
    if (path.endsWith('.fnt')) {
      const text = new TextDecoder().decode(material).split(oldSlug).join(nextSlug)
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
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, hash]) => `${path}\0${hash.toLowerCase()}\n`)
    .join('')
  const nextManifest: BitmapFontManifest = {
    ...manifest,
    slug: nextSlug,
    source: { ...manifest.source, fileName: manifest.source.fileName.split(oldSlug).join(nextSlug) },
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

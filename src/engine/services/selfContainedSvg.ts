/** SVGs inside an offline project may only refer to local fragments or inline raster pixels. */
export function assertSelfContainedSvg(source: string): void {
  const localReference = (value: string) => /^(?:#|data:image\/(?:png|jpeg|jpg|gif|webp);)/i.test(value.trim())
  if (/<!DOCTYPE|<!ENTITY|@import\b/i.test(source)) {
    throw new Error('SVG contains an external dependency; embed its resources before saving the WRT')
  }
  for (const match of source.matchAll(/(?:\bhref|\bsrc)\s*=\s*(["'])([\s\S]*?)\1/gi)) {
    if (match[2] && !localReference(match[2])) throw new Error('SVG contains an external dependency; embed its resources before saving the WRT')
  }
  for (const match of source.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    if (!localReference(match[2])) throw new Error('SVG contains an external dependency; embed its resources before saving the WRT')
  }
}

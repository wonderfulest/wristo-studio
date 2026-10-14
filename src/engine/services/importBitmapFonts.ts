import { getBitmapFontDetail, listBitmapFontChars, createBitmapFont, bindBitmapFontAsset, type BitmapFontAssetRelationVO } from '@/api/wristo/bitmapFont'
import { packageBitmapChars } from './packageAssetRegistry'
import { createBitmapFontColon } from './bitmapFontColon'

const required = Array.from('0123456789:')
const complete = (chars: BitmapFontAssetRelationVO[]) => required.every((value) => chars.some((c) => c.charValue === value && c.image?.url))

/** Register package-local time fonts before applying the imported canvas. */
export async function importBitmapFonts(config: unknown, isCurrent = () => true): Promise<void> {
  const elements: Record<string, any>[] = []
  const visit = (value: any) => {
    if (!value || typeof value !== 'object') return
    if (value.fontRenderType === 'bitmap' && Number(value.bitmapFontId) > 0) elements.push(value)
    Object.values(value).forEach(visit)
  }
  visit(config)
  const replacements = new Map<number, { id: number; chars: BitmapFontAssetRelationVO[] }>()
  for (const id of new Set(elements.filter((e) => e.eleType === 'time').map((e) => Number(e.bitmapFontId)))) {
    if (!isCurrent()) throw new Error('WRT import cancelled')
    let detail
    try {
      detail = (await getBitmapFontDetail(id)).data
    } catch (error: any) {
      if (Number(error?.code ?? error?.response?.status) !== 404) throw error
    }
    const remote = detail ? (await listBitmapFontChars(id)).data || [] : []
    if (detail && complete(remote)) {
      replacements.set(id, { id, chars: remote })
      continue
    }
    // Incomplete shared fonts are copied; never mutate another design's font.
    const chars = packageBitmapChars.get(id) || remote
    const files = new Map<string, Blob>()
    for (const char of chars) {
      if (!char.image?.url) continue
      const response = await fetch(char.image.url)
      if (!response.ok) throw new Error(`Unable to read bitmap glyph ${id}/${char.charValue}`)
      files.set(char.charValue, await response.blob())
    }
    for (const digit of '0123456789') if (!files.has(digit)) throw new Error(`Missing bitmap digit ${id}/${digit}`)
    if (!files.has(':')) files.set(':', await createBitmapFontColon(chars.find((c) => c.charValue === '8')!.image!.url!))
    if (!isCurrent()) throw new Error('WRT import cancelled')
    const created = (await createBitmapFont({ fontName: `${(config as any)?.name || 'WRT'} ${id}` })).data
    if (!created?.id) throw new Error('Bitmap font creation returned no ID')
    for (const [charValue, blob] of files) {
      if (!isCurrent()) throw new Error('WRT import cancelled')
      const result = await bindBitmapFontAsset({
        fontId: created.id,
        charValue,
        charType: /^\d$/.test(charValue) ? 'digital' : 'symbol',
        file: new File([blob], `${charValue.codePointAt(0)}.png`, { type: blob.type })
      })
      if (result.data !== true) throw new Error(`Bitmap glyph upload failed: ${charValue}`)
    }
    const uploaded = (await listBitmapFontChars(created.id)).data || []
    if (!complete(uploaded)) throw new Error(`Uploaded bitmap font ${created.id} is incomplete`)
    replacements.set(id, { id: created.id, chars: uploaded })
  }
  if (!isCurrent()) throw new Error('WRT import cancelled')
  for (const element of elements) element.bitmapFontId = replacements.get(Number(element.bitmapFontId))?.id ?? element.bitmapFontId
  for (const entry of replacements.values()) packageBitmapChars.set(entry.id, entry.chars)
}

import { ElMessageBox } from 'element-plus'
import { translate } from '@/i18n'
import { useLocaleStore } from '@/stores/locale'
import { getBitmapFontDetail, listBitmapFontChars, createBitmapFont, bindBitmapFontAsset, type BitmapFontAssetRelationVO } from '@/api/wristo/bitmapFont'
import { packageBitmapChars } from './packageAssetRegistry'
import { createBitmapFontColon } from './bitmapFontColon'

const required = Array.from('0123456789:')

/** Register package-local bitmap fonts before applying the imported canvas. */
export async function importBitmapFonts(config: unknown, isCurrent = () => true): Promise<void> {
  const elements: Record<string, any>[] = []
  const visit = (value: any) => {
    if (!value || typeof value !== 'object') return
    if (value.fontRenderType === 'bitmap' && Number(value.bitmapFontId) > 0) elements.push(value)
    Object.values(value).forEach(visit)
  }
  visit(config)
  const replacements = new Map<number, { id: number; chars: BitmapFontAssetRelationVO[] }>()
  for (const id of new Set(elements.map((e) => Number(e.bitmapFontId)))) {
    if (!isCurrent()) throw new Error('WRT import cancelled')
    let detail
    try {
      detail = (await getBitmapFontDetail(id)).data
    } catch (error: any) {
      if (Number(error?.code ?? error?.response?.status) !== 404) throw error
    }
    const needsTimeDigits = elements.some((e) => Number(e.bitmapFontId) === id && e.eleType === 'time')
    const remote = detail ? (await listBitmapFontChars(id)).data || [] : []
    const expected = needsTimeDigits ? required : (packageBitmapChars.get(id) || remote).map(c => c.charValue)
    const isComplete = (chars: BitmapFontAssetRelationVO[]) => expected.length > 0 && expected.every(value => chars.some(c => c.charValue === value && c.image?.url))
    if (detail && isComplete(remote)) {
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
    if (!chars.length) throw new Error(`Missing bitmap glyphs: ${id}`)
    for (const digit of needsTimeDigits ? '0123456789' : '') if (!files.has(digit)) throw new Error(`Missing bitmap digit ${id}/${digit}`)
    if (needsTimeDigits && !files.has(':')) files.set(':', await createBitmapFontColon(chars.find((c) => c.charValue === '8')!.image!.url!))
    if (!isCurrent()) throw new Error('WRT import cancelled')
    let fontName = `${(config as any)?.name || 'WRT'} ${id}`
    let created
    let reused = false
    while (!created) {
      if (!isCurrent()) throw new Error('WRT import cancelled')
      try {
        created = (await createBitmapFont({ fontName }, true)).data
        if (!created?.id) throw new Error('Bitmap font creation returned no ID')
      } catch (error: any) {
        if (Number(error?.code) !== 411) throw error
        const candidate = error.data
        const onlineChars = candidate?.id ? (await listBitmapFontChars(candidate.id)).data || [] : []
        const canReuse = candidate?.id && candidate.isActive !== 0 && isComplete(onlineChars)
        const t = (key: Parameters<typeof translate>[0]) => translate(key, useLocaleStore().currentLocale, { name: fontName })
        if (!isCurrent()) throw new Error('WRT import cancelled')
        if (canReuse) {
          try {
            await ElMessageBox.confirm(t('font.conflictChoice'), t('font.conflictTitle'), {
              confirmButtonText: t('font.conflictUse'), cancelButtonText: t('font.conflictRename'),
              distinguishCancelAndClose: true, closeOnClickModal: false, type: 'warning'
            })
            if (!isCurrent()) throw new Error('WRT import cancelled')
            replacements.set(id, { id: candidate.id, chars: onlineChars })
            reused = true
            break
          } catch (action) {
            if (action !== 'cancel') throw new Error('WRT import cancelled')
          }
        }
        try {
          const result = await ElMessageBox.prompt(
            t(canReuse ? 'font.conflictName' : 'font.conflictUnavailable'), t('font.conflictTitle'), {
              inputValue: fontName, confirmButtonText: t('font.conflictRename'), cancelButtonText: t('font.conflictCancel'),
              closeOnClickModal: false,
              inputValidator: value => !!value?.trim() && Array.from(value.trim()).length <= 64 || t('font.conflictInvalid')
            })
          fontName = result.value.trim()
        } catch {
          throw new Error('WRT import cancelled')
        }
      }
    }
    if (reused) continue
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
    if (!isComplete(uploaded)) throw new Error(`Uploaded bitmap font ${created.id} is incomplete`)
    replacements.set(id, { id: created.id, chars: uploaded })
  }
  if (!isCurrent()) throw new Error('WRT import cancelled')
  for (const element of elements) element.bitmapFontId = replacements.get(Number(element.bitmapFontId))?.id ?? element.bitmapFontId
  for (const entry of replacements.values()) packageBitmapChars.set(entry.id, entry.chars)
}

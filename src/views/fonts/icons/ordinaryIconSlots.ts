import type { IconLibraryVO } from '@/api/wristo/iconGlyph'
import type { SvgIconFontSlot } from '@/features/bitmap-font-maker/svgIconPackageBuilder'

export function deriveOrdinaryIconSlots(icons: IconLibraryVO[]): SvgIconFontSlot[] {
  return icons
    .filter((icon) => icon.isActive === 1 && String(icon.category || '').trim().toLowerCase() !== 'weather')
    .map((icon) => {
      const iconUnicode = String(icon.iconUnicode || '').trim().toLowerCase()
      const codepoint = Number.parseInt(iconUnicode, 16)
      const symbolCode = String(icon.symbolCode || '').trim().toLowerCase()
      if (!/^[0-9a-f]{2,6}$/.test(iconUnicode) || !Number.isSafeInteger(codepoint) || !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(symbolCode)) {
        throw new Error('SYSTEM_ICON_SLOT_INVALID')
      }
      return { iconUnicode, codepoint, symbolCode, label: String(icon.label || symbolCode) }
    })
    .sort((left, right) => left.codepoint - right.codepoint)
}

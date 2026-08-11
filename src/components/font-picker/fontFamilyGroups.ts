import type { FontItem } from '@/types/font-picker'

export type FontFamilyGroup = {
  key: string
  family: string
  fonts: FontItem[]
  representative: FontItem
}

const normalizeFamilyKey = (font: FontItem) =>
  String(font.family || font.label || font.value)
    .trim()
    .toLocaleLowerCase()

const displayFamily = (font: FontItem) => String(font.family || font.label || font.value).trim()

const pickRepresentative = (fonts: FontItem[], selectedValue?: string) =>
  fonts.find((font) => font.value === selectedValue) || fonts.find((font) => font.weightClass === 400 && !font.italic) || fonts.find((font) => /(?:^|\s)regular(?:$|\s)/i.test(font.label)) || fonts[0]

export const groupFontsByFamily = (fonts: FontItem[], selectedValue?: string): FontFamilyGroup[] => {
  const groups = new Map<string, { family: string; fonts: FontItem[] }>()

  fonts.forEach((font) => {
    const key = normalizeFamilyKey(font)
    const existing = groups.get(key)
    if (existing) {
      existing.fonts.push(font)
      return
    }
    groups.set(key, { family: displayFamily(font), fonts: [font] })
  })

  return Array.from(groups, ([key, group]) => ({
    key,
    family: group.family,
    fonts: group.fonts,
    representative: pickRepresentative(group.fonts, selectedValue)
  }))
}

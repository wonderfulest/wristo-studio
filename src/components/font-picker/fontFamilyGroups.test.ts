import { describe, expect, it } from 'vitest'
import type { FontItem } from '@/types/font-picker'
import { groupFontsByFamily } from './fontFamilyGroups'

const font = (value: string, family: string, label: string, weightClass?: number): FontItem => ({
  value,
  family,
  label,
  weightClass
})

describe('groupFontsByFamily', () => {
  it('merges different weights from the same family while preserving family order', () => {
    const groups = groupFontsByFamily([
      font('kode-medium', 'Kode Mono', 'Kode Mono Medium', 500),
      font('inter-regular', 'Inter', 'Inter Regular', 400),
      font('kode-bold', 'Kode Mono', 'Kode Mono Bold', 700)
    ])

    expect(groups.map((group) => group.family)).toEqual(['Kode Mono', 'Inter'])
    expect(groups[0].fonts.map((item) => item.value)).toEqual(['kode-medium', 'kode-bold'])
  })

  it('treats family names case-insensitively and trims whitespace', () => {
    const groups = groupFontsByFamily([font('jetbrains-regular', ' JetBrains Mono ', 'JetBrains Mono Regular'), font('jetbrains-bold', 'jetbrains mono', 'JetBrains Mono Bold')])

    expect(groups).toHaveLength(1)
    expect(groups[0].family).toBe('JetBrains Mono')
  })

  it('uses the selected font as the collapsed representative', () => {
    const groups = groupFontsByFamily(
      [font('inter-light', 'Inter', 'Inter Light', 300), font('inter-regular', 'Inter', 'Inter Regular', 400), font('inter-bold', 'Inter', 'Inter Bold', 700)],
      'inter-bold'
    )

    expect(groups[0].representative.value).toBe('inter-bold')
  })

  it('prefers a regular weight when the family is not selected', () => {
    const groups = groupFontsByFamily([font('inter-light', 'Inter', 'Inter Light', 300), font('inter-regular', 'Inter', 'Inter Regular', 400), font('inter-bold', 'Inter', 'Inter Bold', 700)])

    expect(groups[0].representative.value).toBe('inter-regular')
  })
})

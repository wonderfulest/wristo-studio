import { describe, expect, it } from 'vitest'
import { deriveOrdinaryIconSlots } from './ordinaryIconSlots'

describe('deriveOrdinaryIconSlots', () => {
  it('uses every active non-weather system icon in deterministic unicode order', () => {
    const slots = deriveOrdinaryIconSlots([
      { id: 3, iconUnicode: '101d', symbolCode: 'clear_sky', category: 'weather', label: 'Clear sky', isActive: 1 },
      { id: 2, iconUnicode: '0031', symbolCode: 'steps', category: 'field', label: 'Steps', isActive: 1 },
      { id: 1, iconUnicode: '0030', symbolCode: 'heart_rate', category: 'field', label: 'Heart rate', isActive: 1 },
      { id: 4, iconUnicode: '0032', symbolCode: 'inactive', category: 'field', label: 'Inactive', isActive: 0 },
    ])

    expect(slots).toEqual([
      { iconUnicode: '0030', codepoint: 0x30, symbolCode: 'heart_rate', label: 'Heart rate' },
      { iconUnicode: '0031', codepoint: 0x31, symbolCode: 'steps', label: 'Steps' },
    ])
  })
})

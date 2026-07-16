import { describe, expect, it, vi } from 'vitest'

vi.mock('@/api/wristo/iconGlyph', () => ({ getIconGlyphByCode: vi.fn() }))

import { hasIconFontSlugConflict } from './iconFontSlugAvailability'

describe('hasIconFontSlugConflict', () => {
  it('allows an unchanged slug without a lookup', async () => {
    const lookup = vi.fn()

    await expect(hasIconFontSlugConflict('wristo', 'wristo', lookup)).resolves.toBe(false)
    expect(lookup).not.toHaveBeenCalled()
  })

  it('reports a slug returned by the API as a conflict', async () => {
    const lookup = vi.fn().mockResolvedValue({ data: { id: 9, glyphCode: 'wristo' } })

    await expect(hasIconFontSlugConflict('wristo', '', lookup)).resolves.toBe(true)
  })

  it('allows a slug not returned by the API', async () => {
    const lookup = vi.fn().mockResolvedValue({ data: null })

    await expect(hasIconFontSlugConflict('animal-cute', '', lookup)).resolves.toBe(false)
  })
})

import { describe, expect, it, vi } from 'vitest'
import { createLocalProjectFont } from './localProjectFont'

describe('local project fonts', () => {
  it('keys imports by bytes rather than filename and preserves parsed build metadata', async () => {
    const objectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-font')
    const first = await createLocalProjectFont(new File(['font bytes'], 'First.ttf'), { glyphCount: 42, family: 'Family', weightClass: 700 }, 'time_font', 'en')
    const renamed = await createLocalProjectFont(new File(['font bytes'], 'Renamed.ttf'), { glyphCount: 42 }, 'time_font', 'en')
    const changed = await createLocalProjectFont(new File(['other font'], 'First.ttf'), { glyphCount: 42 }, 'time_font', 'en')
    expect(first.slug).toEqual(renamed.slug)
    expect(first.slug).not.toEqual(changed.slug)
    expect(first).toMatchObject({ family: 'Family', glyphCount: 42, weightClass: 700, type: 'time_font', language: 'en', ttfFile: { url: 'blob:local-font' } })
    objectUrl.mockRestore()
  })
})

import { describe, expect, it } from 'vitest'
import { readUnsavedDesigns, rememberUnsavedDesign, forgetUnsavedDesign } from './unsavedDesigns'
function storage() {
  const values = new Map<string, string>()
  return { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) }
}
describe('unsaved design history', () => {
  it('keeps older drafts when a new one is created and separates accounts', () => {
    const s = storage()
    rememberUnsavedDesign(s, 1, { designId: 'old', name: 'Old', savedAt: 10 })
    rememberUnsavedDesign(s, 1, { designId: 'new', name: 'New', savedAt: 20 })
    expect(readUnsavedDesigns(s, 1).map(v => v.designId)).toEqual(['new', 'old'])
    expect(readUnsavedDesigns(s, 2)).toEqual([])
    forgetUnsavedDesign(s, 1, 'new')
    expect(readUnsavedDesigns(s, 1).map(v => v.designId)).toEqual(['old'])
  })
  it('updates edited designs without duplicate records', () => {
    const s = storage()
    rememberUnsavedDesign(s, 1, { designId: 'old', name: 'Old', savedAt: 10 })
    rememberUnsavedDesign(s, 1, { designId: 'new', name: 'New', savedAt: 20 })
    rememberUnsavedDesign(s, 1, { designId: 'old', name: 'Renamed', savedAt: 30 })
    expect(readUnsavedDesigns(s, 1)).toEqual([{ designId: 'old', name: 'Renamed', savedAt: 30 }, { designId: 'new', name: 'New', savedAt: 20 }])
  })
  it('ignores corrupt metadata', () => {
    expect(readUnsavedDesigns({ getItem: () => '{invalid' }, 1)).toEqual([])
    expect(readUnsavedDesigns({ getItem: () => '[null, {}, {"designId":1}]' }, 1)).toEqual([])
  })
})

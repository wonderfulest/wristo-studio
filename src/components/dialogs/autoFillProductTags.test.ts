import { expect, it } from 'vitest'
import { autoFillProductTags } from './goLiveTags'
const tags = ['garmin', 'watch-face', 'connect-iq', 'everyday', 'daily', 'smartwatch', 'lifestyle', 'personal-style', 'watchface', 'battery', 'fenix'].map((slug, i) => ({ id: i + 1, name: slug, slug, tagGroup: 'meta', status: 1, sort: 0 }))
it('fills eight general tags when generated names do not match', () => {
  const ids = autoFillProductTags('App BNLYRC', tags, [], null, 20, () => 0)
  expect(ids).toHaveLength(8)
  expect(new Set(ids).size).toBe(8)
  expect(ids).not.toContain(10)
  expect(ids).not.toContain(11)
})
it('prioritizes actual features before random search terms', () => {
  expect(autoFillProductTags('', tags, [], { elements: [{ eleType: 'battery' }] }, 20, () => 0)[0]).toBe(10)
})
it('excludes existing and disabled tags and honors remaining capacity', () => {
  const selected = Array.from({ length: 18 }, (_, i) => i + 20)
  const result = autoFillProductTags('', [{ ...tags[0], status: 0 }, tags[1], tags[2]], selected, null, 20)
  expect(result).toEqual(expect.arrayContaining([2, 3]))
  expect(result).toHaveLength(2)
  expect(autoFillProductTags('', tags, [1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual([])
  expect(autoFillProductTags('', tags, selected, null, 18)).toEqual([])
})
it('shuffles candidates without mutating the dictionary', () => {
  const before = tags.map(t => t.id)
  expect(autoFillProductTags('', tags, [], null, 20, () => 0)).not.toEqual(autoFillProductTags('', tags, [], null, 20, () => 0.99))
  expect(tags.map(t => t.id)).toEqual(before)
})
it('handles an empty dictionary', () => expect(autoFillProductTags('', [], [])).toEqual([]))
it('uses new general discovery terms but only matches specific styles when relevant', () => {
  const dictionary = ['watch-inspiration', 'luxury', 'halloween'].map((slug, i) => ({
    id: i + 1, name: slug, slug, tagGroup: 'style', status: 1, sort: 0
  }))
  expect(autoFillProductTags('App BNLYRC', dictionary, [])).toEqual([1])
  expect(autoFillProductTags('Luxury', dictionary, [])).toEqual([2, 1])
})
it('prioritizes compatible device families ahead of features and general tags', () => {
  const dictionary = ['battery', 'fenix', 'forerunner', 'venu', 'epix', 'instinct', 'vivoactive', 'everyday'].map((slug, i) => ({
    id: i + 1, name: slug, slug, tagGroup: i > 0 && i < 7 ? 'device' : 'function', status: 1, sort: 0
  }))
  expect(autoFillProductTags('Epix Instinct', dictionary, [], { elements: [{ eleType: 'battery' }] }, 20, () => 0, 'fenix7,fr265,venu3'))
    .toEqual([2, 3, 4, 1, 8])
  expect(autoFillProductTags('', dictionary, [2], null, 2, () => 0, 'fenix7,fr265')).toEqual([3])
  expect(autoFillProductTags('Fenix', dictionary, [], null, 20, () => 0, '')).toEqual([8])
})

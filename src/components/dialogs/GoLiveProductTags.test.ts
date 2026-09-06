import { describe, expect, it } from 'vitest'
import type { ProductTag } from '@/types/api/productTag'
import { tagDescriptionSuffix, matchPastedTags, suggestProductTags, syncTagDescription, filterEnabledProductTags, restorePublishedTagIds, validatePublishedTagIds } from './goLiveTags'

const tags: ProductTag[] = [
  { id: 1, name: 'Minimal', slug: 'minimal', tagGroup: 'style', sort: 3, status: 1 },
  { id: 28, name: 'AMOLED', slug: 'amoled', tagGroup: 'function', sort: 2, status: 1 },
  { id: 38, name: 'Everyday', slug: 'everyday', tagGroup: 'scene', sort: 1, status: 1 },
  { id: 49, name: 'Christmas', slug: 'christmas', tagGroup: 'seasonal', sort: 0, status: 0 }
]

describe('Go Live product tags', () => {
  it('keeps every enabled group in API order', () => {
    expect(filterEnabledProductTags(tags).map((tag) => tag.id)).toEqual([1, 28, 38])
  })

  it('restores selected enabled tags in API order and caps at twenty', () => {
    const options = Array.from({ length: 21 }, (_, index) => ({
      ...tags[index % 3],
      id: index + 1,
      status: 1
    }))

    expect(
      restorePublishedTagIds(
        options,
        options.map((tag) => tag.id)
      )
    ).toEqual(options.slice(0, 20).map((tag) => tag.id))
  })

  it('requires one to twenty unique numeric IDs', () => {
    expect(validatePublishedTagIds([])).toBe('required')
    expect(validatePublishedTagIds([1, 1])).toBe('invalid')
    expect(validatePublishedTagIds(Array.from({ length: 21 }, (_, i) => i + 1))).toBe('invalid')
    expect(validatePublishedTagIds(Array.from({ length: 20 }, (_, i) => i + 1))).toBeNull()
    expect(validatePublishedTagIds([1, 28, 38])).toBeNull()
  })
})

describe('tag entry and description', () => {
  it('matches comma, Chinese comma and newline separated names without duplicates', () => {
    expect(matchPastedTags(' minimal，#AMOLED;Everyday\nMinimal,missing,Christmas', tags)).toEqual([1, 28, 38])
  })
  it('suggests only enabled matching words', () => {
    expect(suggestProductTags('Minimal AMOLED for Everyday. Christmas', tags)).toEqual([1, 28, 38])
    expect(suggestProductTags('minimalism', tags)).toEqual([])
  })
  it('updates or removes the generated suffix while preserving the body', () => {
    expect(syncTagDescription('Body\n\n#Minimal', '#Minimal', '#AMOLED')).toBe('Body\n\n#AMOLED')
    expect(syncTagDescription('Body\n\n#Minimal', '#Minimal', '')).toBe('Body')
    expect(syncTagDescription('Body\n\n#Minimal', '', '#Minimal')).toBe('Body\n\n#Minimal')
    expect(syncTagDescription('Body\n\n#Minimal\n\nExtra text', '#Minimal', '#AMOLED')).toBe('Body\n\nExtra text\n\n#AMOLED')
    expect(syncTagDescription('Body mentions #Minimal', '', '#Minimal')).toBe('Body mentions #Minimal\n\n#Minimal')
  })
})


describe('description tag normalization', () => {
  it('replaces reordered, escaped and repeated trailing tag paragraphs', () => {
    const description = '## Feature Overview\n\nBody mentions #Minimal\n\n\\#AMOLED #Minimal\n\n#Minimal #AMOLED #Everyday'
    const expected = '## Feature Overview\n\nBody mentions #Minimal\n\n#Minimal #Everyday'
    expect(syncTagDescription(description, '#Minimal #AMOLED', '#Minimal #Everyday')).toBe(expected)
    expect(syncTagDescription(expected, '', '#Minimal #Everyday')).toBe(expected)
  })

  it('removes trailing tags from suggestion text even without an exact previous suffix', () => {
    expect(syncTagDescription('## Heading\n\nBody\n\n#AMOLED #Minimal', '', '')).toBe('## Heading\n\nBody')
  })

  it('deduplicates IDs and case-insensitive names while preserving selection order', () => {
    const options = [...tags, { ...tags[0], id: 99, name: ' minimal ' }]
    expect(tagDescriptionSuffix([1, 1, 99, 28], options)).toBe('#Minimal #AMOLED')
  })
})

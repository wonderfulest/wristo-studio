import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import {
  appendCopiedDynamicImageItems,
  extractDynamicImageGroups,
} from './dynamicImage.copyModel'

describe('dynamic image group copying', () => {
  it('extracts only non-empty dynamic image groups and gives unnamed groups stable labels', () => {
    const groups = extractDynamicImageGroups({
      elements: [
        { eleType: 'text', id: 'text-1' },
        {
          eleType: 'dynamicImage',
          id: 'dynamic-1',
          layerName: 'Weather states',
          items: [{ id: 'rule-1', imageUrl: '/sun.png', expression: { source: 'weather == 1' } }],
        },
        { eleType: 'dynamicImage', id: 'dynamic-empty', items: [] },
        {
          eleType: 'dynamicImage',
          id: 'dynamic-2',
          items: [{ id: 'rule-2', imageUrl: '/moon.png', expression: { source: 'false' } }],
        },
      ],
    })

    expect(groups.map(group => ({ id: group.id, label: group.label, count: group.items.length }))).toEqual([
      { id: 'dynamic-1', label: 'Weather states', count: 1 },
      { id: 'dynamic-2', label: 'Dynamic image group 2', count: 1 },
    ])
  })

  it('accepts a JSON string config and rejects malformed configs without throwing', () => {
    expect(extractDynamicImageGroups(JSON.stringify({
      elements: [{
        eleType: 'dynamicImage',
        id: 'dynamic-1',
        items: [{ id: 'rule-1', imageUrl: '/sun.png', expression: { source: 'true' } }],
      }],
    }))).toHaveLength(1)
    expect(extractDynamicImageGroups('{invalid')).toEqual([])
    expect(extractDynamicImageGroups(null)).toEqual([])
  })

  it('appends cloned rules and regenerates every copied id', () => {
    const existing = [{
      id: 'current-rule',
      imageUrl: '/current.png',
      assetId: 10,
      expression: { source: 'true', ast: { type: 'literal', value: true } },
    }] as any
    const source = [{
      id: 'source-rule',
      imageUrl: '/source.png',
      assetId: 20,
      expression: { source: 'false', ast: { type: 'literal', value: false } },
    }] as any

    const result = appendCopiedDynamicImageItems(existing, source, () => 'new-rule-id')

    expect(result).toEqual([
      existing[0],
      { ...source[0], id: 'new-rule-id' },
    ])
    expect(result[1]).not.toBe(source[0])
    expect(result[1].expression).not.toBe(source[0].expression)
  })

  it('copies rules received as Vue reactive proxies', () => {
    const source = reactive([{
      id: 'source-rule',
      imageUrl: '/source.png',
      expression: { source: 'false', ast: { type: 'literal', value: false } },
    }]) as any

    expect(() => appendCopiedDynamicImageItems([], source, () => 'copied-rule')).not.toThrow()
    expect(appendCopiedDynamicImageItems([], source, () => 'copied-rule')[0]).toEqual({
      id: 'copied-rule',
      imageUrl: '/source.png',
      expression: { source: 'false', ast: { type: 'literal', value: false } },
    })
  })
})

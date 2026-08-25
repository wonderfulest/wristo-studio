import { describe, expect, it } from 'vitest'
import { remapLayoutGroupForPaste } from './layoutGroupClipboard'

describe('remapLayoutGroupForPaste', () => {
  it('creates a fresh group and rewrites every member id while preserving layout settings', () => {
    const result = remapLayoutGroupForPaste({
      id: 'row-1', name: 'Battery Row', direction: 'horizontal', left: 100, top: 40, originX: 'right',
      members: [
        { elementId: 'data-1', gapBefore: 0, offsetY: 0 },
        { elementId: 'unit-1', gapBefore: 2, offsetY: 3 },
      ],
    }, new Map([['data-1', 'data-2'], ['unit-1', 'unit-2']]), 'row-2', 30, 20)

    expect(result).toEqual({
      id: 'row-2', name: 'Battery Row Copy', direction: 'horizontal', left: 130, top: 60, originX: 'right',
      members: [
        { elementId: 'data-2', gapBefore: 0, offsetY: 0 },
        { elementId: 'unit-2', gapBefore: 2, offsetY: 3 },
      ],
    })
  })

  it('rejects a partial member-id map', () => {
    expect(() => remapLayoutGroupForPaste({
      id: 'row-1', name: 'Row', direction: 'horizontal', left: 0, top: 0, originX: 'left',
      members: [{ elementId: 'a', gapBefore: 0, offsetY: 0 }, { elementId: 'b', gapBefore: 0, offsetY: 0 }],
    }, new Map([['a', 'next-a']]), 'row-2', 0, 0)).toThrow('b')
  })
})

import { describe, expect, it, vi } from 'vitest'
import {
  createSerialTaskQueue,
  measureActualBounds,
  restoreCanvasObjects,
} from './shortcutAddTransaction'

type FakeObject = {
  id: string
  eleType: string
  getBoundingRect?: () => { left: number; top: number; width: number; height: number }
}

const createFakeCanvas = (initialObjects: FakeObject[]) => {
  let objects = [...initialObjects]
  return {
    getObjects: () => objects,
    remove: (target: FakeObject) => {
      objects = objects.filter((object) => object !== target)
    },
    insertAt: (index: number, ...targets: FakeObject[]) => {
      objects.splice(index, 0, ...targets)
    },
    moveObjectTo: (target: FakeObject, index: number) => {
      objects = objects.filter((object) => object !== target)
      objects.splice(index, 0, target)
    },
  }
}

describe('shortcut add serial task queue', () => {
  it('runs overlapping tasks one at a time and returns each task result', async () => {
    const enqueue = createSerialTaskQueue()
    const events: string[] = []
    let releaseFirst!: () => void
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })

    const first = enqueue(async () => {
      events.push('first:start')
      await firstGate
      events.push('first:end')
      return 'first-result'
    })
    const second = enqueue(async () => {
      events.push('second:start')
      events.push('second:end')
      return 'second-result'
    })

    await Promise.resolve()
    expect(events).toEqual(['first:start'])
    releaseFirst()

    await expect(first).resolves.toBe('first-result')
    await expect(second).resolves.toBe('second-result')
    expect(events).toEqual(['first:start', 'first:end', 'second:start', 'second:end'])
  })

  it('continues after a failed task', async () => {
    const enqueue = createSerialTaskQueue()
    const failed = enqueue(async () => {
      throw new Error('failed transaction')
    })
    const next = enqueue(async () => 'next-result')

    await expect(failed).rejects.toThrow('failed transaction')
    await expect(next).resolves.toBe('next-result')
  })
})

describe('shortcut actual bounds measurement', () => {
  it('returns complete bounds only when every created element is measurable', () => {
    const result = measureActualBounds([
      {
        id: 'first',
        getBoundingRect: () => ({ left: 10, top: 20, width: 30, height: 40 }),
      },
      {
        id: 'second',
        getBoundingRect: () => ({ left: 50, top: 10, width: 20, height: 60 }),
      },
    ])

    expect(result).toEqual({
      status: 'all',
      bounds: { left: 10, top: 10, width: 60, height: 60 },
    })
  })

  it('marks partial bounds unreadable and does not return a refinement footprint', () => {
    const result = measureActualBounds([
      {
        id: 'valid',
        getBoundingRect: () => ({ left: 10, top: 20, width: 30, height: 40 }),
      },
      {
        id: 'invalid',
        getBoundingRect: () => ({ left: 0, top: 0, width: 0, height: 20 }),
      },
    ])

    expect(result).toEqual({ status: 'partial', bounds: null })
  })

  it('distinguishes completely unreadable bounds', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      const result = measureActualBounds([
        {
          id: 'broken',
          getBoundingRect: () => {
            throw new Error('unreadable')
          },
        },
      ])

      expect(result).toEqual({ status: 'none', bounds: null })
    } finally {
      warn.mockRestore()
    }
  })
})

describe('shortcut canvas transaction rollback', () => {
  it('removes objects added before a handler throws, including remove fallbacks', () => {
    const existing = { id: 'existing', eleType: 'data' }
    const orphan = { id: 'orphan', eleType: 'data' }
    const canvas = createFakeCanvas([existing])
    const beforeObjects = [...canvas.getObjects()]
    canvas.insertAt(1, orphan)
    const removeElement = vi.fn(() => undefined)

    restoreCanvasObjects(canvas, beforeObjects, removeElement)

    expect(removeElement).toHaveBeenCalledWith(orphan)
    expect(canvas.getObjects()).toEqual([existing])
  })

  it('restores an existing axis object removed by its replacement handler', () => {
    const global = { id: 'global', eleType: 'global' }
    const background = { id: 'background', eleType: 'background' }
    const oldHand = { id: 'old-hour', eleType: 'hourHand' }
    const newHand = { id: 'new-hour', eleType: 'hourHand' }
    const canvas = createFakeCanvas([global, background, oldHand])
    const beforeObjects = [...canvas.getObjects()]
    canvas.remove(oldHand)
    canvas.insertAt(2, newHand)

    restoreCanvasObjects(canvas, beforeObjects, (target) => canvas.remove(target))

    expect(canvas.getObjects()).toEqual([global, background, oldHand])
  })

  it('throws when a newly added object still remains after rollback attempts', () => {
    const existing = { id: 'existing', eleType: 'data' }
    const orphan = { id: 'orphan', eleType: 'data' }
    const objects = [existing, orphan]
    const canvas = {
      getObjects: () => objects,
      remove: () => {
        throw new Error('remove failed')
      },
      insertAt: vi.fn(),
      moveObjectTo: vi.fn(),
    }

    expect(() => restoreCanvasObjects(canvas, [existing], () => undefined)).toThrow(
      'Shortcut rollback failed',
    )
  })
})

import { describe, expect, it, vi } from 'vitest'
import { createOwnedDispose, SubDialEditorRegistry } from './subDial.editorRegistry'

const editor = () => ({ dispose: vi.fn() })

describe('SubDialEditorRegistry', () => {
  it('disposes the previous owner and ignores its later unregister', () => {
    const registry = new SubDialEditorRegistry<any>()
    const first = editor(),
      second = editor()
    registry.register(first)
    registry.register(second)
    expect(first.dispose).toHaveBeenCalledOnce()
    registry.unregister(first)
    expect(registry.current()).toBe(second)
  })

  it('unsubscribes exactly and isolates failing subscribers', () => {
    const registry = new SubDialEditorRegistry<any>()
    const values: any[] = []
    registry.subscribe(() => {
      throw new Error('listener')
    })
    const stop = registry.subscribe((value) => values.push(value))
    const first = editor()
    registry.register(first)
    stop()
    registry.unregister(first)
    expect(values).toEqual([null, first])
  })

  it('keeps the replacement owner when disposing the previous owner throws', () => {
    const registry = new SubDialEditorRegistry<any>()
    const first = {
      dispose: vi.fn(() => {
        throw new Error('dispose')
      })
    }
    const second = editor()
    const values: any[] = []
    registry.subscribe((value) => values.push(value))
    registry.register(first)
    expect(() => registry.register(second)).toThrow('dispose')
    expect(registry.current()).toBe(second)
    expect(values).toEqual([null, first, second])
    registry.unregister(first)
    expect(registry.current()).toBe(second)
  })

  it('unregisters an active owner even when dispose throws and only disposes once', () => {
    const registry = new SubDialEditorRegistry<any>()
    const owner: { dispose: () => void } = editor()
    const dispose = vi.fn(() => {
      throw new Error('dispose')
    })
    owner.dispose = createOwnedDispose(owner, registry, dispose)
    registry.register(owner)
    expect(() => owner.dispose()).toThrow('dispose')
    expect(registry.current()).toBeNull()
    expect(() => owner.dispose()).not.toThrow()
    expect(dispose).toHaveBeenCalledOnce()
  })
})

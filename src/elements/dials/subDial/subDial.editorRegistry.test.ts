import { describe, expect, it, vi } from 'vitest'
import { SubDialEditorRegistry } from './subDial.editorRegistry'

const editor = () => ({ dispose: vi.fn() })

describe('SubDialEditorRegistry', () => {
  it('disposes the previous owner and ignores its later unregister', () => {
    const registry = new SubDialEditorRegistry<any>()
    const first = editor(), second = editor()
    registry.register(first)
    registry.register(second)
    expect(first.dispose).toHaveBeenCalledOnce()
    registry.unregister(first)
    expect(registry.current()).toBe(second)
  })

  it('unsubscribes exactly and isolates failing subscribers', () => {
    const registry = new SubDialEditorRegistry<any>()
    const values: any[] = []
    registry.subscribe(() => { throw new Error('listener') })
    const stop = registry.subscribe(value => values.push(value))
    const first = editor()
    registry.register(first)
    stop()
    registry.unregister(first)
    expect(values).toEqual([null, first])
  })
})

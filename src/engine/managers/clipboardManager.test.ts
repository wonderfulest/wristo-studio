import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('fabric', () => ({
  ActiveSelection: class {
    objects: any[]
    options: Record<string, unknown>
    hasControls = true
    coordsSet = false

    constructor(objects: any[], options: Record<string, unknown>) {
      this.objects = objects
      this.options = options
    }

    set(values: { hasControls?: boolean }) {
      Object.assign(this, values)
    }

    setCoords() {
      this.coordsSet = true
    }
  },
}))
vi.mock('@/engine/registry/elementRegistry', () => ({ encodeElementByRegistry: vi.fn() }))
vi.mock('@/stores/canvasStore', () => ({ useCanvasStore: vi.fn() }))
vi.mock('@/engine/managers/elementManager', () => ({ addElement: vi.fn() }))
vi.mock('@/stores/historyStore', () => ({ useHistoryStore: vi.fn() }))
vi.mock('nanoid', () => ({ nanoid: vi.fn(() => 'new-id') }))

import { commitPastedSelection } from './clipboardManager'

function createCanvas() {
  return {
    discardActiveObject: vi.fn(),
    setActiveObject: vi.fn(),
    requestRenderAll: vi.fn(),
  }
}

describe('commitPastedSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('replaces the old selection with all pasted objects', () => {
    const canvas = createCanvas()
    const pastedObjects = [{ id: 'new-1' }, { id: 'new-2' }]

    commitPastedSelection(canvas as any, pastedObjects as any)

    expect(canvas.discardActiveObject).toHaveBeenCalledOnce()
    expect(canvas.setActiveObject).toHaveBeenCalledOnce()
    const selection = canvas.setActiveObject.mock.calls[0][0] as {
      objects: any[]
      options: Record<string, unknown>
      hasControls: boolean
      coordsSet: boolean
    }
    expect(selection.objects).toEqual(pastedObjects)
    expect(selection.options.canvas).toBe(canvas)
    expect(selection.hasControls).toBe(false)
    expect(selection.coordsSet).toBe(true)
    expect(canvas.requestRenderAll).toHaveBeenCalledOnce()
  })

  it('selects the pasted object directly when only one succeeds', () => {
    const canvas = createCanvas()
    const pastedObject = { id: 'new-1' }

    commitPastedSelection(canvas as any, [pastedObject] as any)

    expect(canvas.discardActiveObject).toHaveBeenCalledOnce()
    expect(canvas.setActiveObject).toHaveBeenCalledWith(pastedObject)
    expect(canvas.requestRenderAll).toHaveBeenCalledOnce()
  })

  it('clears the old selection without creating an empty selection', () => {
    const canvas = createCanvas()

    commitPastedSelection(canvas as any, [])

    expect(canvas.discardActiveObject).toHaveBeenCalledOnce()
    expect(canvas.setActiveObject).not.toHaveBeenCalled()
    expect(canvas.requestRenderAll).toHaveBeenCalledOnce()
  })
})

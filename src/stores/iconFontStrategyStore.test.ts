// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { canvas, patchElement, originalTextRender } = vi.hoisted(() => ({
  canvas: { getObjects: vi.fn(), renderAll: vi.fn(), requestRenderAll: vi.fn() },
  patchElement: vi.fn(),
  originalTextRender: vi.fn(),
}))

vi.mock('@/stores/canvasStore', () => ({ useCanvasStore: () => ({ canvas }) }))
vi.mock('@/stores/elementDataStore', () => ({ useElementDataStore: () => ({ patchElement }) }))

import { useIconFontStrategyStore } from './iconFontStrategyStore'

describe('global bitmap icon font strategy', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    patchElement.mockClear()
    originalTextRender.mockClear()
    canvas.renderAll.mockClear()
  })

  it('rebinds and persists every MIP icon through the bitmap-only renderer', () => {
    const icon: any = {
      id: 'precipitation-icon', eleType: 'icon', iconDisplayType: 'mip',
      text: 'g', fontFamily: 'wristo-icon', fontSize: 30, fill: '#fff',
      _renderText: originalTextRender,
      set(values: Record<string, unknown> | string, value?: unknown) {
        if (typeof values === 'string') this[values] = value
        else Object.assign(this, values)
      },
      initDimensions: vi.fn(), setCoords: vi.fn(),
    }
    canvas.getObjects.mockReturnValue([icon])

    useIconFontStrategyStore().updateAllIconFont('qiwei-two')
    icon._renderText({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D)

    expect(originalTextRender).not.toHaveBeenCalled()
    expect(icon.assetFontFamily).toBe('qiwei-two')
    expect(patchElement).toHaveBeenCalledWith('precipitation-icon', {
      fontFamily: 'qiwei-two', iconFont: 'qiwei-two',
    })
  })
})

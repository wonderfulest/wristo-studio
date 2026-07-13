// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { canvas, updateElement } = vi.hoisted(() => ({
  canvas: {
    getObjects: vi.fn(),
    requestRenderAll: vi.fn(),
  },
  updateElement: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({ canvas }),
}))

vi.mock('@/stores/properties', () => ({
  usePropertiesStore: () => ({ allProperties: {}, getMetricByOptions: vi.fn() }),
}))

vi.mock('@/stores/designStore', () => ({
  useDesignStore: () => ({ supportsChineseContent: false, defaultLocale: 'en' }),
}))

vi.mock('@/engine/managers/elementManager', () => ({ updateElement }))

vi.mock('@/engine/simulator/simulatedClock', () => ({
  getSimulatedNow: () => new Date('2026-07-13T12:34:00.000Z'),
}))

vi.mock('@/utils/dataSimulator', () => ({
  getSimulatedBarChartSeries: vi.fn(),
  getSimulatedDataByName: vi.fn(),
  tickSimulatedData: vi.fn(),
}))

import { DataSimulatorEngine } from './dataSimulatorEngine'

describe('DataSimulatorEngine bitmap time refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('dispatches the simulated time to bitmap time elements', () => {
    const bitmapTime = {
      id: 'bitmap-time',
      eleType: 'time',
      type: 'group',
      fontRenderType: 'bitmap',
      formatter: 0,
    }
    canvas.getObjects.mockReturnValue([bitmapTime])

    new DataSimulatorEngine().updateCanvas()

    expect(updateElement).toHaveBeenCalledWith(bitmapTime, {
      simulatedTime: new Date('2026-07-13T12:34:00.000Z'),
    })
  })
})

// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { canvas, updateElement, getMetricByOptions } = vi.hoisted(() => ({
  canvas: {
    getObjects: vi.fn(),
    requestRenderAll: vi.fn(),
  },
  updateElement: vi.fn(() => Promise.resolve()),
  getMetricByOptions: vi.fn(),
}))

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({ canvas }),
}))

vi.mock('@/stores/properties', () => ({
  usePropertiesStore: () => ({ allProperties: {}, getMetricByOptions }),
}))

vi.mock('@/stores/dataCatalogStore', () => ({
  useDataCatalogStore: () => ({
    snapshot: {
      dataTypeOptions: [{ valueCode: 0, metricSymbol: ':FIELD_TYPE_HEART_RATE', label: { eng: 'HR', zhs: '心率' }, unitKey: 'none' }],
      unitsByKey: new Map([['none', { unitKey: 'none', defaultVariant: null, variants: {} }]]),
      aliasOwners: new Map(),
    },
  }),
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
import { TimeFormatConstants } from '@/config/settings'

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

  it('previews the hour format indicator as 24H for TrueType time elements', () => {
    const set = vi.fn()
    canvas.getObjects.mockReturnValue([
      {
        id: 'hour-format',
        eleType: 'time',
        type: 'text',
        fontRenderType: 'truetype',
        formatter: TimeFormatConstants.HOUR_FORMAT,
        text: '',
        set,
      },
    ])

    new DataSimulatorEngine().updateCanvas()

    expect(set).toHaveBeenCalledWith('text', '24H')
    expect(canvas.requestRenderAll).toHaveBeenCalled()
  })

  it('rejects an unknown label symbol instead of rendering the catalog first item', () => {
    const set = vi.fn()
    getMetricByOptions.mockReturnValue(undefined)
    canvas.getObjects.mockReturnValue([{ id: 'unknown-label', eleType: 'label', metricSymbol: ':FIELD_TYPE_UNKNOWN', text: '', set }])

    expect(() => new DataSimulatorEngine().updateCanvas()).toThrow(
      'data type option :FIELD_TYPE_UNKNOWN: canonical definition is missing',
    )
    expect(set).not.toHaveBeenCalled()
  })
})

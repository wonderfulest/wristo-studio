// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { canvas, updateElement, getMetricByOptions, getSimulatedDataByName } = vi.hoisted(() => ({
  canvas: {
    getObjects: vi.fn(),
    requestRenderAll: vi.fn(),
  },
  updateElement: vi.fn(() => Promise.resolve()),
  getMetricByOptions: vi.fn(),
  getSimulatedDataByName: vi.fn(() => ({ display: '80', numeric: 80, unit: '' })),
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
      dataTypeOptions: [
        { valueCode: 0, metricSymbol: ':FIELD_TYPE_HEART_RATE', label: { eng: 'HR', zhs: '心率' }, unitKey: 'none' },
        { valueCode: 1004, metricSymbol: ':FIELD_TYPE_SLEEP_SCORE', label: { eng: 'SLPS', zhs: '睡眠' }, unitKey: 'none' },
      ],
      optionsByValueCode: new Map([
        [0, { valueCode: 0, metricSymbol: ':FIELD_TYPE_HEART_RATE', label: { eng: 'HR', zhs: '心率' }, unitKey: 'none' }],
        [1004, { valueCode: 1004, metricSymbol: ':FIELD_TYPE_SLEEP_SCORE', label: { eng: 'SLPS', zhs: '睡眠' }, unitKey: 'none' }],
      ]),
      optionsByMetricSymbol: new Map([
        [':FIELD_TYPE_HEART_RATE', { valueCode: 0, metricSymbol: ':FIELD_TYPE_HEART_RATE', label: { eng: 'HR', zhs: '心率' }, unitKey: 'none' }],
        [':FIELD_TYPE_SLEEP_SCORE', { valueCode: 1004, metricSymbol: ':FIELD_TYPE_SLEEP_SCORE', label: { eng: 'SLPS', zhs: '睡眠' }, unitKey: 'none' }],
      ]),
      unitsByKey: new Map([['none', { unitKey: 'none', defaultVariant: null, selectionPolicy: { type: 'none' }, variants: {} }]]),
      aliasOwners: new Map(),
    },
  }),
}))

vi.mock('@/stores/designStore', () => ({
  useDesignStore: () => ({ appLanguage: 'zh' }),
}))

vi.mock('@/stores/previewDeviceContextStore', () => ({
  usePreviewDeviceContextStore: () => ({
    toContext: (language: 'eng' | 'zhs') => ({
      language, distanceUnits: 'metric', temperatureUnits: 'metric',
    }),
  }),
}))

vi.mock('@/engine/managers/elementManager', () => ({ updateElement }))

vi.mock('@/engine/simulator/simulatedClock', () => ({
  getSimulatedNow: () => new Date('2026-07-13T12:34:00.000Z'),
}))

vi.mock('@/utils/dataSimulator', () => ({
  getSimulatedBarChartSeries: vi.fn(),
  getSimulatedDataByName,
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

  it('maps the sleep score symbol to the distinct sleep score simulation', () => {
    const set = vi.fn()
    getMetricByOptions.mockReturnValue({
      valueCode: 1004,
      metricSymbol: ':FIELD_TYPE_SLEEP_SCORE',
      label: { eng: 'SLPS', zhs: '睡眠' },
      unitKey: 'none',
    })
    canvas.getObjects.mockReturnValue([
      { id: 'sleep-score', eleType: 'data', metricSymbol: ':FIELD_TYPE_SLEEP_SCORE', text: '', set },
    ])

    new DataSimulatorEngine().updateCanvas()

    expect(getSimulatedDataByName).toHaveBeenCalledWith('sleepScore')
  })

  it('rejects an unknown label symbol instead of rendering the catalog first item', () => {
    const set = vi.fn()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    getMetricByOptions.mockReturnValue(undefined)
    canvas.getObjects.mockReturnValue([{ id: 'unknown-label', eleType: 'label', metricSymbol: ':FIELD_TYPE_UNKNOWN', text: '', set }])

    new DataSimulatorEngine().updateCanvas()
    expect(set).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledOnce()
    expect(String(errorSpy.mock.calls[0][1].error?.message)).toBe('data type option :FIELD_TYPE_UNKNOWN: canonical definition is missing')
    errorSpy.mockRestore()
  })

  it('isolates unknown data errors, deduplicates them across ticks, and reports again after recovery', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const badSet = vi.fn()
    const goodSet = vi.fn()
    const bad: any = { id: 'bad-data', eleType: 'data', metricSymbol: ':FIELD_TYPE_UNKNOWN', text: '', set: badSet }
    const good = { id: 'good-time', eleType: 'time', formatter: TimeFormatConstants.HOUR_FORMAT, text: '', set: goodSet }
    getMetricByOptions.mockReturnValue(undefined)
    canvas.getObjects.mockReturnValue([bad, good])
    const engine = new DataSimulatorEngine()

    engine.updateCanvas()
    engine.updateCanvas()
    expect(badSet).not.toHaveBeenCalled()
    expect(goodSet).toHaveBeenCalledWith('text', '24H')
    expect(errorSpy).toHaveBeenCalledTimes(1)

    bad.metricSymbol = ':FIELD_TYPE_HEART_RATE'
    getMetricByOptions.mockReturnValue({ value: 0, metricSymbol: ':FIELD_TYPE_HEART_RATE' })
    engine.updateCanvas()
    bad.metricSymbol = ':FIELD_TYPE_UNKNOWN'
    getMetricByOptions.mockReturnValue(undefined)
    engine.updateCanvas()
    expect(errorSpy).toHaveBeenCalledTimes(2)
    errorSpy.mockRestore()
  })
})

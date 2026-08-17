// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { canvas, updateElement, getMetricByOptions, getSimulatedDataByName, getSimulatedDataByTokenCode } = vi.hoisted(() => ({
  canvas: {
    getObjects: vi.fn(),
    requestRenderAll: vi.fn(),
  },
  updateElement: vi.fn(() => Promise.resolve()),
  getMetricByOptions: vi.fn(),
  getSimulatedDataByName: vi.fn(() => ({ display: '80', numeric: 80, unit: '' })),
  getSimulatedDataByTokenCode: vi.fn(() => ({ display: '80', numeric: 80, unit: 'bpm' })),
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
        { valueCode: 20, metricSymbol: ':FIELD_TYPE_DISTANCE', label: { eng: 'DIST', zhs: '距离' }, unitKey: 'distance', defaultValue: '8.5' },
        { valueCode: 1004, metricSymbol: ':FIELD_TYPE_SLEEP_SCORE', label: { eng: 'SLPS', zhs: '睡眠' }, unitKey: 'none' },
        { valueCode: 1201, metricSymbol: ':FIELD_TYPE_PRECIPITATION_CHANCE_CURRENT', label: { eng: 'Current Precipitation', zhs: '当前降水概率' }, unitKey: 'percentage' },
        { valueCode: 1202, metricSymbol: ':FIELD_TYPE_PRECIPITATION_CHANCE_NEXT_HOUR', label: { eng: 'Next Hour Precipitation', zhs: '未来一小时降水概率' }, unitKey: 'percentage' },
        { valueCode: 1203, metricSymbol: ':FIELD_TYPE_PRECIPITATION_CHANCE_TODAY', label: { eng: 'Today Precipitation', zhs: '今日降水概率' }, unitKey: 'percentage' },
      ],
      optionsByValueCode: new Map([
        [0, { valueCode: 0, metricSymbol: ':FIELD_TYPE_HEART_RATE', label: { eng: 'HR', zhs: '心率' }, unitKey: 'none' }],
        [20, { valueCode: 20, metricSymbol: ':FIELD_TYPE_DISTANCE', label: { eng: 'DIST', zhs: '距离' }, unitKey: 'distance', defaultValue: '8.5' }],
        [1004, { valueCode: 1004, metricSymbol: ':FIELD_TYPE_SLEEP_SCORE', label: { eng: 'SLPS', zhs: '睡眠' }, unitKey: 'none' }],
        [1201, { valueCode: 1201, metricSymbol: ':FIELD_TYPE_PRECIPITATION_CHANCE_CURRENT', label: { eng: 'Current Precipitation', zhs: '当前降水概率' }, unitKey: 'percentage' }],
        [1202, { valueCode: 1202, metricSymbol: ':FIELD_TYPE_PRECIPITATION_CHANCE_NEXT_HOUR', label: { eng: 'Next Hour Precipitation', zhs: '未来一小时降水概率' }, unitKey: 'percentage' }],
        [1203, { valueCode: 1203, metricSymbol: ':FIELD_TYPE_PRECIPITATION_CHANCE_TODAY', label: { eng: 'Today Precipitation', zhs: '今日降水概率' }, unitKey: 'percentage' }],
      ]),
      optionsByMetricSymbol: new Map([
        [':FIELD_TYPE_HEART_RATE', { valueCode: 0, metricSymbol: ':FIELD_TYPE_HEART_RATE', label: { eng: 'HR', zhs: '心率' }, unitKey: 'none' }],
        [':FIELD_TYPE_DISTANCE', { valueCode: 20, metricSymbol: ':FIELD_TYPE_DISTANCE', label: { eng: 'DIST', zhs: '距离' }, unitKey: 'distance', defaultValue: '8.5' }],
        [':FIELD_TYPE_SLEEP_SCORE', { valueCode: 1004, metricSymbol: ':FIELD_TYPE_SLEEP_SCORE', label: { eng: 'SLPS', zhs: '睡眠' }, unitKey: 'none' }],
        [':FIELD_TYPE_PRECIPITATION_CHANCE_CURRENT', { valueCode: 1201, metricSymbol: ':FIELD_TYPE_PRECIPITATION_CHANCE_CURRENT', label: { eng: 'Current Precipitation', zhs: '当前降水概率' }, unitKey: 'percentage' }],
        [':FIELD_TYPE_PRECIPITATION_CHANCE_NEXT_HOUR', { valueCode: 1202, metricSymbol: ':FIELD_TYPE_PRECIPITATION_CHANCE_NEXT_HOUR', label: { eng: 'Next Hour Precipitation', zhs: '未来一小时降水概率' }, unitKey: 'percentage' }],
        [':FIELD_TYPE_PRECIPITATION_CHANCE_TODAY', { valueCode: 1203, metricSymbol: ':FIELD_TYPE_PRECIPITATION_CHANCE_TODAY', label: { eng: 'Today Precipitation', zhs: '今日降水概率' }, unitKey: 'percentage' }],
      ]),
      unitsByKey: new Map([
        ['none', { unitKey: 'none', defaultVariant: null, selectionPolicy: { type: 'none' }, variants: {} }],
        ['distance', { unitKey: 'distance', defaultVariant: 'km', selectionPolicy: { type: 'fixed', variant: 'km' }, variants: { km: { label: { eng: 'km', zhs: '公里' } } } }],
        ['percentage', { unitKey: 'percentage', defaultVariant: 'percent', selectionPolicy: { type: 'fixed', variant: 'percent' }, variants: { percent: { label: { eng: '%', zhs: '%' } } } }],
      ]),
      aliasOwners: new Map(),
    },
  }),
}))

vi.mock('@/stores/designStore', () => ({
  useDesignStore: () => ({ appLanguage: 'zhs' }),
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
  getSimulatedDataByTokenCode,
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

  it('renders the resolved compact token value for text templates', () => {
    const set = vi.fn()
    canvas.getObjects.mockReturnValue([
      { id: 'heart-rate-template', eleType: 'angledText', textTemplate: '(ds9)', text: '{{ds9}}', set },
    ])

    new DataSimulatorEngine().updateCanvas()

    expect(getSimulatedDataByTokenCode).toHaveBeenCalledWith('ds9')
    expect(set).toHaveBeenCalledWith('text', '80')
  })

  it('keeps Chinese unit labels when the simulator refreshes a Chinese application', () => {
    const set = vi.fn()
    getMetricByOptions.mockReturnValue({
      valueCode: 20,
      metricSymbol: ':FIELD_TYPE_DISTANCE',
      label: { eng: 'DIST', zhs: '距离' },
      unitKey: 'distance',
      defaultValue: '8.5',
    })
    canvas.getObjects.mockReturnValue([
      { id: 'distance-unit', eleType: 'unit', metricSymbol: ':FIELD_TYPE_DISTANCE', text: '', set },
    ])

    new DataSimulatorEngine().updateCanvas()

    expect(set).toHaveBeenCalledWith('text', '公里')
  })

  it.each([
    [':FIELD_TYPE_PRECIPITATION_CHANCE_CURRENT', 'precipitationChanceCurrent'],
    [':FIELD_TYPE_PRECIPITATION_CHANCE_NEXT_HOUR', 'precipitationChanceNextHour'],
    [':FIELD_TYPE_PRECIPITATION_CHANCE_TODAY', 'precipitationChanceToday'],
  ])('maps %s to its precipitation simulation', (metricSymbol, simulationKey) => {
    const set = vi.fn()
    getMetricByOptions.mockReturnValue({
      valueCode: metricSymbol.endsWith('CURRENT') ? 1201 : metricSymbol.endsWith('NEXT_HOUR') ? 1202 : 1203,
      metricSymbol,
      label: { eng: 'Precipitation', zhs: '降水概率' },
      unitKey: 'percentage',
    })
    canvas.getObjects.mockReturnValue([
      { id: simulationKey, eleType: 'data', metricSymbol, text: '', set },
    ])

    new DataSimulatorEngine().updateCanvas()

    expect(getSimulatedDataByName).toHaveBeenCalledWith(simulationKey)
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

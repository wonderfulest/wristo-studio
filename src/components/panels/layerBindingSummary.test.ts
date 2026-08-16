import { describe, expect, it } from 'vitest'
import type { LayerElement } from '@/types/layer'
import type { PropertiesMap } from '@/types/properties'
import { resolveLayerDisplayName, resolveLayerGroupDisplayName, type LayerBindingSummaryContext } from './layerBindingSummary'

const layer = (eleType: string, element: Record<string, unknown> = {}, layerName?: string): LayerElement => ({
  id: `${eleType}-1`,
  layerName,
  visible: true,
  displayStates: { active: true, ambient: true },
  locked: false,
  selectable: true,
  eleType,
  element: { eleType, ...element }
})

const properties: PropertiesMap = {
  data_1: { type: 'data', title: 'Data 1', value: ':FIELD_TYPE_STEPS' },
  goal_1: {
    type: 'goal',
    title: 'Goal 1',
    value: ':GOAL_TYPE_STEPS',
    options: [{ label: 'Daily Steps', labelCn: '每日步数', value: ':GOAL_TYPE_STEPS' }]
  }
}

const context: LayerBindingSummaryContext = {
  language: 'zh',
  properties,
  typeLabel: (type) => ({ data: '数据', goal: '目标', date: '日期', time: '时间', weather: '天气' })[type] ?? type,
  metricLabel: ({ dataProperty }) => dataProperty === 'data_1' ? '步数' : ''
}

describe('layerBindingSummary', () => {
  it('appends the selected data item to the element type', () => {
    expect(resolveLayerDisplayName(layer('data', { dataProperty: 'data_1' }), context)).toBe('数据 · 步数')
  })

  it('appends the selected goal item to the element type', () => {
    expect(resolveLayerDisplayName(layer('goalBar', { goalProperty: 'goal_1' }), context)).toBe('goalBar · 每日步数')
  })

  it('appends date and time formats', () => {
    expect(resolveLayerDisplayName(layer('date', { formatter: 32 }), context)).toBe('日期 · MM/DD')
    expect(resolveLayerDisplayName(layer('time', { formatter: 0 }), context)).toBe('时间 · HH:mm')
  })

  it('describes the fixed weather data item', () => {
    expect(resolveLayerDisplayName(layer('weather'), context)).toBe('天气 · 天气状况')
  })

  it('keeps a custom layer name unchanged', () => {
    expect(resolveLayerDisplayName(layer('data', { dataProperty: 'data_1' }, 'My Steps'), context)).toBe('My Steps')
  })

  it('uses the property kind and selected item for collapsed groups', () => {
    expect(resolveLayerGroupDisplayName('data_1', context)).toBe('数据 · 步数')
    expect(resolveLayerGroupDisplayName('goal_1', context)).toBe('目标 · 每日步数')
  })

  it('falls back to the current type or group key when binding details are unavailable', () => {
    expect(resolveLayerDisplayName(layer('data', { dataProperty: 'data_9' }), context)).toBe('数据')
    expect(resolveLayerGroupDisplayName('group_a', context)).toBe('group_a')
  })
})

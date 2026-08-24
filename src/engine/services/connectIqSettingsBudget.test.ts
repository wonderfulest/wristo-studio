import { describe, expect, it } from 'vitest'
import {
  CONNECT_IQ_SETTINGS_BUDGET_BYTES,
  CONNECT_IQ_SETTINGS_WARNING_BYTES,
  calculateConnectIqSettingsBudget,
  classifyConnectIqSettingsUsage,
} from './connectIqSettingsBudget'

describe('Connect IQ settings budget', () => {
  it('uses a 20 KB budget and warns at 80 percent', () => {
    expect(CONNECT_IQ_SETTINGS_BUDGET_BYTES).toBe(20480)
    expect(CONNECT_IQ_SETTINGS_WARNING_BYTES).toBe(16384)
    expect(classifyConnectIqSettingsUsage(16383)).toBe('normal')
    expect(classifyConnectIqSettingsUsage(16384)).toBe('warning')
    expect(classifyConnectIqSettingsUsage(20480)).toBe('warning')
    expect(classifyConnectIqSettingsUsage(20481)).toBe('exceeded')
  })

  it('counts fixed settings, custom properties, list options, and unique date settings', () => {
    const report = calculateConnectIqSettingsBudget({
      appLanguage: 'zhs',
      properties: {
        color_1: {
          type: 'color', title: 'Color', value: '0xFFFFFF',
          options: [{ label: 'White', value: '0xFFFFFF' }, { label: 'Black', value: '0x000000' }],
        },
      } as any,
      elements: [
        { type: 'date', dateId: 0, formatter: 52 },
        { type: 'date', dateId: 0, formatter: 52 },
        { type: 'date', dateId: 1, formatter: 21 },
      ],
    })

    expect(report.fixedSettings).toBe(9)
    expect(report.customSettings).toBe(1)
    expect(report.dateSettings).toBe(2)
    expect(report.listOptions).toBe(2 + 3 + 4 + 33 * 2)
    expect(report.totalSettings).toBe(12)
    expect(report.usedBytes).toBeGreaterThan(0)
  })

  it('charges additional UTF-8 bytes for longer translated option labels', () => {
    const short = calculateConnectIqSettingsBudget({
      properties: { text_1: { type: 'text', title: 'A', value: 'x', options: [] } } as any,
      elements: [],
      appLanguage: 'eng',
    })
    const long = calculateConnectIqSettingsBudget({
      properties: { text_1: { type: 'text', title: '很长的中文标题', value: '一段更长的中文默认文本', options: [] } } as any,
      elements: [],
      appLanguage: 'zhs',
    })

    expect(long.usedBytes).toBeGreaterThan(short.usedBytes)
  })

  it('counts the configured options for each date instead of every language format', () => {
    const report = calculateConnectIqSettingsBudget({
      appLanguage: 'eng',
      properties: {},
      elements: [{ type: 'date', dateId: 0, formatter: 6, formatterOptions: [6, 13] }],
    })

    expect(report.dateSettings).toBe(1)
    expect(report.listOptions).toBe(3 + 4 + 2)
  })

  it('counts one shared date property for multiple bound date elements', () => {
    const report = calculateConnectIqSettingsBudget({
      appLanguage: 'eng',
      properties: {
        date_1: {
          type: 'date', title: 'Date 1', value: 31,
          options: [{ label: 'MM-DD', value: 31 }, { label: 'MM/DD', value: 32 }],
        },
      },
      elements: [
        { type: 'date', dateProperty: 'date_1' },
        { type: 'date', dateProperty: 'date_1' },
      ],
    })

    expect(report.customSettings).toBe(0)
    expect(report.dateSettings).toBe(1)
    expect(report.listOptions).toBe(3 + 4 + 2)
  })

  it('does not count Studio-only custom date templates as Connect IQ settings', () => {
    const report = calculateConnectIqSettingsBudget({
      appLanguage: 'eng',
      properties: {},
      elements: [{ type: 'date', dateId: 0, formatter: 8, dateFormatMode: 'custom' }],
    })

    expect(report.dateSettings).toBe(0)
  })

  it('recalculates usage from the current app settings', () => {
    const defaults = calculateConnectIqSettingsBudget({
      properties: {},
      elements: [],
      textCase: 0,
      dataNumberFormat: 0,
      maxFieldLength: 8,
      bitmapMode: true,
    })
    const changed = calculateConnectIqSettingsBudget({
      properties: {},
      elements: [],
      textCase: 2,
      dataNumberFormat: 3,
      maxFieldLength: 12,
      bitmapMode: false,
    })

    expect(changed.usedBytes).not.toBe(defaults.usedBytes)
  })
})

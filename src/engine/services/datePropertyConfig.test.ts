import { describe, expect, it } from 'vitest'
import { DateFormatConstants } from '@/config/elements/options/dateFormats'
import {
  migrateLegacyDateProperties,
  resolveDatePropertyConfig,
} from './datePropertyConfig'

describe('date property config', () => {
  it('migrates each legacy date element to a stable date property', () => {
    const result = migrateLegacyDateProperties({
      properties: {},
      elements: [
        { id: 'first', eleType: 'date', formatter: DateFormatConstants.MM_DD, formatterOptions: [DateFormatConstants.MM_DD, DateFormatConstants.MM_DD_SLASH] },
        { id: 'second', eleType: 'date', formatter: DateFormatConstants.DDD, formatterOptions: [DateFormatConstants.DDD] },
      ],
    }, 'eng')

    expect(result.properties.date_1).toMatchObject({
      type: 'date',
      title: 'Date 1',
      value: DateFormatConstants.MM_DD,
    })
    expect(result.properties.date_1.options?.map(option => option.value)).toEqual([
      DateFormatConstants.MM_DD,
      DateFormatConstants.MM_DD_SLASH,
    ])
    expect(result.elements.map(element => element.dateProperty)).toEqual(['date_1', 'date_2'])
  })

  it('keeps multiple elements bound to one existing date property', () => {
    const property = {
      type: 'date' as const,
      title: 'Primary date',
      value: DateFormatConstants.MM_DD,
      options: [{ label: 'MM-DD', value: DateFormatConstants.MM_DD }],
    }
    const result = migrateLegacyDateProperties({
      properties: { date_primary: property },
      elements: [
        { id: 'first', eleType: 'date', dateProperty: 'date_primary', formatter: 0 },
        { id: 'second', eleType: 'date', dateProperty: 'date_primary', formatter: 1 },
      ],
    }, 'eng')

    expect(result.properties).toEqual({ date_primary: property })
    expect(result.elements).toEqual([
      expect.objectContaining({ dateProperty: 'date_primary', formatter: DateFormatConstants.MM_DD }),
      expect.objectContaining({ dateProperty: 'date_primary', formatter: DateFormatConstants.MM_DD }),
    ])
  })

  it('resolves the shared property value and options for preview and export', () => {
    const resolved = resolveDatePropertyConfig(
      { dateProperty: 'date_1', formatter: 0, formatterOptions: [0] },
      {
        date_1: {
          type: 'date',
          title: 'Date 1',
          value: DateFormatConstants.MM_DD,
          options: [
            { label: 'MM-DD', value: DateFormatConstants.MM_DD },
            { label: 'MM/DD', value: DateFormatConstants.MM_DD_SLASH },
          ],
        },
      },
    )

    expect(resolved).toEqual({
      dateProperty: 'date_1',
      formatter: DateFormatConstants.MM_DD,
      formatterOptions: [DateFormatConstants.MM_DD, DateFormatConstants.MM_DD_SLASH],
    })
  })
})

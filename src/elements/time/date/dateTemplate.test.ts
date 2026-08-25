import { describe, expect, it } from 'vitest'
import {
  createRandomDateTemplate,
  formatCustomDateTemplate,
  validateCustomDateTemplate,
} from './dateTemplate'

describe('custom date templates', () => {
  it('formats the requested short weekday and padded numeric date parts', () => {
    const date = new Date(2026, 5, 30, 12, 0, 0)

    expect(formatCustomDateTemplate(
      '(dt5.1) + "." + (dt3).format("%02d") + "." + (dt2).format("%02d")',
      date,
      'en-US',
    )).toBe('Tue.30.06')
  })

  it('rejects non-date tokens in a date template', () => {
    expect(validateCustomDateTemplate('(ai12)')).toContain('Date templates only support date and calendar tokens: ai12')
  })

  it('supports the complete abbreviated Gregorian date token family', () => {
    const date = new Date(2026, 5, 30, 12, 0, 0)

    expect(formatCustomDateTemplate(
      '(dt1) + "/" + (dt1.1) + "/" + (dt2) + "/" + (dt2.1) + "/" + (dt2.2) + "/" + (dt3) + "/" + (dt4) + "/" + (dt5) + "/" + (dt5.1) + "/" + (dt5.2) + "/" + (dt6)',
      date,
      'en-US',
    )).toBe('2026/26/6/Jun/June/30/27/3/Tue/Tuesday/181')
  })

  it('creates a valid template containing only month, day, and weekday tokens', () => {
    const template = createRandomDateTemplate('', () => 0)

    expect(template).toBe('(dt2) + "." + (dt3) + "." + (dt5.1)')
    expect(validateCustomDateTemplate(template)).toEqual([])
  })

  it('does not return the current template when another candidate is available', () => {
    const firstTemplate = createRandomDateTemplate('', () => 0)

    expect(createRandomDateTemplate(firstTemplate, () => 0)).not.toBe(firstTemplate)
  })
})

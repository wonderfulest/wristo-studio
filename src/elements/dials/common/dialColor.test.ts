import { describe, expect, it, vi } from 'vitest'
import {
  applyDialColorPreview,
  resolveDialColorPatch,
  supportsDialDynamicColor,
} from './dialColor'

const properties = {
  accentColor: { type: 'color', title: 'Accent', value: '0x9EEA20' },
  dataValue: { type: 'data', title: 'Steps', value: ':STEPS' },
} as any

describe('resolveDialColorPatch', () => {
  it('binds a property key and its current color', () => {
    expect(resolveDialColorPatch('accentColor', properties, '#123456')).toEqual({
      fillProperty: 'accentColor',
      fill: '#9eea20',
    })
  })

  it('clears the binding while retaining the current color', () => {
    expect(resolveDialColorPatch('', properties, '#123456')).toEqual({
      fillProperty: '',
      fill: '#123456',
    })
  })

  it('clears invalid and non-color property bindings', () => {
    expect(resolveDialColorPatch('dataValue', properties, '#abcdef')).toEqual({
      fillProperty: '',
      fill: '#abcdef',
    })
  })
})

describe('supportsDialDynamicColor', () => {
  it('supports only tick12 and tick60', () => {
    expect(supportsDialDynamicColor('tick12')).toBe(true)
    expect(supportsDialDynamicColor('tick60')).toBe(true)
    expect(supportsDialDynamicColor('romans')).toBe(false)
  })
})

describe('applyDialColorPreview', () => {
  it('adds one owned tint filter and preserves unrelated filters', () => {
    const unrelated = { type: 'Blur' }
    const image = {
      filters: [unrelated],
      applyFilters: vi.fn(),
    }

    applyDialColorPreview(image, '#9eea20', 'accentColor')

    expect(image.filters).toHaveLength(2)
    expect(image.filters[0]).toBe(unrelated)
    expect(image.filters[1]).toMatchObject({
      color: '#9eea20',
      mode: 'tint',
      alpha: 1,
      __wristoDialColorFilter: true,
    })
    expect(image.applyFilters).toHaveBeenCalledTimes(1)
  })

  it('replaces the previous owned filter instead of stacking filters', () => {
    const image = { filters: [], applyFilters: vi.fn() }

    applyDialColorPreview(image, '#111111', 'firstColor')
    applyDialColorPreview(image, '#222222', 'secondColor')

    expect(image.filters).toHaveLength(1)
    expect(image.filters[0]).toMatchObject({ color: '#222222' })
  })

  it('keeps tinting when a static color clears the property binding', () => {
    const unrelated = { type: 'Blur' }
    const image = { filters: [unrelated], applyFilters: vi.fn() }
    applyDialColorPreview(image, '#111111', 'accentColor')

    applyDialColorPreview(image, '#55ff55', '')

    expect(image.filters).toHaveLength(2)
    expect(image.filters[0]).toBe(unrelated)
    expect(image.filters[1]).toMatchObject({
      color: '#55ff55',
      __wristoDialColorFilter: true,
    })
    expect(image.applyFilters).toHaveBeenCalledTimes(2)
  })

  it('removes the owned filter for transparent to show the original SVG colors', () => {
    const unrelated = { type: 'Blur' }
    const image = { filters: [unrelated], applyFilters: vi.fn() }
    applyDialColorPreview(image, '#111111', 'accentColor')

    applyDialColorPreview(image, 'transparent', '')

    expect(image.filters).toEqual([unrelated])
    expect(image.applyFilters).toHaveBeenCalledTimes(2)
  })
})

import { describe, expect, it } from 'vitest'
import { createElementStyleMemory } from './elementStyleMemory'

describe('element style memory', () => {
  it('reuses the last text font identity and color without copying size or content', () => {
    const memory = createElementStyleMemory()
    memory.remember({
      eleType: 'text',
      fontFamily: 'fabric-preview-family',
      assetFontFamily: 'published-text-font',
      fontRenderType: 'bitmap',
      bitmapFontId: 42,
      fontSize: 68,
      text: 'Previous content',
      fill: '#12abef',
      fillProperty: 'primary_color',
    })

    expect(memory.apply({
      eleType: 'date',
      fontFamily: 'roboto-condensed-regular',
      fontSize: 24,
      formatter: 7,
      fill: '#ffffff',
    })).toEqual({
      eleType: 'date',
      fontFamily: 'published-text-font',
      assetFontFamily: 'published-text-font',
      fontRenderType: 'bitmap',
      bitmapFontId: 42,
      fontSize: 24,
      formatter: 7,
      fill: '#12abef',
      fillProperty: 'primary_color',
    })
  })

  it('prefers an explicitly edited font over stale runtime asset identity', () => {
    const memory = createElementStyleMemory()
    memory.remember({
      eleType: 'text',
      fontFamily: 'old-preview-family',
      assetFontFamily: 'old-published-font',
      fill: '#ffffff',
    }, {
      fontFamily: 'new-published-font',
    })

    expect(memory.apply({
      eleType: 'data',
      fontFamily: 'schema-font',
      fill: '#ffffff',
    })).toMatchObject({
      fontFamily: 'new-published-font',
      assetFontFamily: 'new-published-font',
    })
  })

  it('reuses the complete ordinary icon while explicit shortcut fields stay authoritative', () => {
    const memory = createElementStyleMemory()
    memory.remember({
      eleType: 'icon',
      fontFamily: 'fabric-icon-preview',
      assetFontFamily: 'custom-icon-font',
      iconFont: 'custom-icon-font',
      metricSymbol: ':FIELD_TYPE_HEART_RATE',
      dataProperty: 'data_2',
      goalProperty: null,
      iconDisplayType: 'amoled',
      amoledImageUrl: 'blob:heart-rate',
      amoledIconUnicode: '0067',
      text: '0067',
      fill: '#ff3366',
      fillProperty: 'accent_color',
      iconSize: 48,
    })

    expect(memory.apply({
      eleType: 'icon',
      fontFamily: 'wristo-icon',
      iconFont: 'wristo-icon',
      iconDisplayType: 'mip',
      iconSize: 24,
      fill: '#ffffff',
    })).toMatchObject({
      fontFamily: 'custom-icon-font',
      iconFont: 'custom-icon-font',
      metricSymbol: ':FIELD_TYPE_HEART_RATE',
      dataProperty: 'data_2',
      goalProperty: null,
      iconDisplayType: 'amoled',
      amoledImageUrl: 'blob:heart-rate',
      amoledIconUnicode: '0067',
      text: '0067',
      fill: '#ff3366',
      fillProperty: 'accent_color',
      iconSize: 24,
    })

    const explicitlyOverridden = memory.apply({
      eleType: 'icon',
      fontFamily: 'wristo-icon',
      iconFont: 'wristo-icon',
      iconDisplayType: 'mip',
      fill: '#ffffff',
    }, {
      metricSymbol: ':FIELD_TYPE_STEPS',
      dataProperty: 'data_9',
      goalProperty: null,
      iconDisplayType: 'mip',
      fill: '#00ff00',
    })
    expect(explicitlyOverridden).toMatchObject({
      fontFamily: 'custom-icon-font',
      iconFont: 'custom-icon-font',
      metricSymbol: ':FIELD_TYPE_STEPS',
      dataProperty: 'data_9',
      goalProperty: null,
      iconDisplayType: 'mip',
      fill: '#00ff00',
    })
    expect(explicitlyOverridden.fillProperty).toBeUndefined()
  })

  it('keeps weather icons separate from ordinary icons', () => {
    const memory = createElementStyleMemory()
    memory.remember({
      eleType: 'weather',
      iconUnicode: '102d',
      fontFamily: 'fabric-weather-preview',
      assetFontFamily: 'weather-outline',
      previewSource: 'blob:weather-preview',
      fill: '#80c8ff',
    })

    expect(memory.apply({
      eleType: 'weather',
      iconUnicode: '101d',
      fontFamily: 'weather-default',
      fill: '#ffffff',
    })).toMatchObject({
      iconUnicode: '102d',
      fontFamily: 'weather-outline',
      previewSource: 'blob:weather-preview',
      fill: '#80c8ff',
    })

    expect(memory.apply({
      eleType: 'icon',
      fontFamily: 'wristo-icon',
      iconFont: 'wristo-icon',
      fill: '#ffffff',
    })).toMatchObject({
      fontFamily: 'wristo-icon',
      iconFont: 'wristo-icon',
      fill: '#80c8ff',
    })
  })

  it('maps the color field most recently edited onto the destination primary color field', () => {
    const memory = createElementStyleMemory()
    memory.remember({
      eleType: 'line',
      stroke: '#111111',
      strokeProperty: null,
    }, {
      stroke: '#fedcba',
      strokeProperty: 'line_color',
    })

    expect(memory.apply({
      eleType: 'text',
      fontFamily: 'roboto-condensed-regular',
      fill: '#ffffff',
    })).toMatchObject({
      fill: '#fedcba',
      fillProperty: 'line_color',
    })
  })

  it('falls back to schema defaults after the memory is cleared', () => {
    const memory = createElementStyleMemory()
    memory.remember({ eleType: 'text', fontFamily: 'remembered-font', fill: '#123456' })
    memory.clear()

    expect(memory.apply({
      eleType: 'text',
      fontFamily: 'schema-font',
      fill: '#ffffff',
    })).toEqual({
      eleType: 'text',
      fontFamily: 'schema-font',
      fill: '#ffffff',
    })
  })
})

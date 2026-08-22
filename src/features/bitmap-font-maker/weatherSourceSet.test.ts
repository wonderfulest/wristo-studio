import { describe, expect, it } from 'vitest'
import { WEATHER_FONT_CODEPOINTS, WEATHER_FONT_SLOTS, matchWeatherSlotFromFileName, validateWeatherSvgSource } from './weatherSourceSet'

describe('weather bitmap font source set', () => {
  it('keeps the twelve standard weather codes in their canonical order', () => {
    expect(WEATHER_FONT_SLOTS.map((slot) => slot.iconUnicode)).toEqual(['101d', '101e', '102d', '102e', '103d', '104d', '109d', '110d', '110e', '111d', '113d', '150d'])
    expect(WEATHER_FONT_CODEPOINTS).toEqual([0x101d, 0x101e, 0x102d, 0x102e, 0x103d, 0x104d, 0x109d, 0x110d, 0x110e, 0x111d, 0x113d, 0x150d])
  })

  it('matches files by unicode prefix or standard symbol name', () => {
    expect(matchWeatherSlotFromFileName('101d-clear-sky.svg')?.iconUnicode).toBe('101d')
    expect(matchWeatherSlotFromFileName('partly-cloudy-night.svg')?.iconUnicode).toBe('102e')
    expect(matchWeatherSlotFromFileName('unknown.svg')).toBeUndefined()
  })

  it('accepts local vector SVG and rejects executable or remote content', () => {
    expect(() => validateWeatherSvgSource('<svg viewBox="0 0 24 24"><path d="M0 0h24v24z"/></svg>')).not.toThrow()
    expect(() => validateWeatherSvgSource('<svg><script>alert(1)</script></svg>')).toThrow('SVG_SCRIPT_NOT_ALLOWED')
    expect(() => validateWeatherSvgSource('<svg><use href="https://example.com/icon.svg#sun"/></svg>')).toThrow('SVG_EXTERNAL_REFERENCE_NOT_ALLOWED')
  })

  it('accepts an SVG document with an XML declaration', () => {
    expect(() =>
      validateWeatherSvgSource('<?xml version="1.0" encoding="UTF-8"?>\n<svg viewBox="0 0 24 24"><path d="M0 0h24v24z"/></svg>'),
    ).not.toThrow()
  })

  it('accepts an SVG 1.1 document with an XML declaration and doctype', () => {
    expect(() =>
      validateWeatherSvgSource('<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg viewBox="0 0 1024 1024"><path d="M0 0h24v24z"/></svg>'),
    ).not.toThrow()
  })

})

import { describe, expect, it } from 'vitest'
import { assertSelfContainedSvg } from './selfContainedSvg'

describe('offline SVG dependencies', () => {
  it('allows fragment paints and inline raster pixels', () => {
    expect(() => assertSelfContainedSvg('<svg><use href="#hand"/><path fill="url(#gradient)"/><image href="data:image/png;base64,AA=="/></svg>')).not.toThrow()
  })
  it.each([
    '<svg><image href="https://cdn.example.com/photo.png"/></svg>',
    '<svg><use xlink:href="other.svg#hand"/></svg>',
    '<svg><path fill="url(https://cdn.example.com/gradient.svg#g)"/></svg>',
    '<svg><style>@import "theme.css";</style></svg>',
    '<!DOCTYPE svg SYSTEM "external.dtd"><svg/>',
    '<svg><image href="data:image/svg+xml,%3Csvg%3E"/></svg>',
  ])('rejects externally linked SVG content %s', source => {
    expect(() => assertSelfContainedSvg(source)).toThrow('external dependency')
  })
})

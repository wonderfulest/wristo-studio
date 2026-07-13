import { describe, expect, it, vi } from 'vitest'
import { decodePolygon, encodePolygon } from './polygon.encoder'
import { DEFAULT_POLYGON_POINTS } from './polygon.geometry'

const triangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }]

describe('polygon encoder', () => {
  it('round trips normalized points and gradient fields defensively', () => {
    const decoded = decodePolygon({
      eleType: 'polygon', id: 'p', left: 10, top: 20, width: 100, height: 80,
      originX: 'center', originY: 'center',
      polygonPoints: triangle, fill: '#112233', stroke: '#ffffff', strokeWidth: 2,
      gradientEnabled: true, gradientStartColor: '#ff0000', gradientEndColor: '#00ff00',
      gradientDirection: 'topToBottom',
    }) as any
    const encoded = encodePolygon(decoded)
    expect(encoded.polygonPoints).toEqual(triangle)
    expect(encoded.polygonPoints).not.toBe(triangle)
    expect(decoded.gradientEnabled).toBe(true)
    expect(encoded.gradientEnabled).toBe(true)
  })

  it('forces a concave polygon to a solid fill', () => {
    const concave = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 0.4 }, { x: 1, y: 1 }, { x: 0, y: 1 }]
    const decoded = decodePolygon({
      eleType: 'polygon', id: 'concave', left: 0, top: 0, width: 100, height: 100,
      originX: 'center', originY: 'center', polygonPoints: concave,
      fill: '#112233', stroke: '#ffffff', strokeWidth: 1, gradientEnabled: true,
    } as any) as any
    expect(decoded.gradientEnabled).toBe(false)
    expect(encodePolygon(decoded).gradientEnabled).toBe(false)
  })

  it('warns and falls back to the default polygon for invalid points', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const decoded = decodePolygon({
      eleType: 'polygon', id: 'bad', left: 0, top: 0, width: 100, height: 100,
      polygonPoints: triangle.slice(0, 2), fill: '#fff', stroke: '#fff', strokeWidth: 1,
    } as any) as any
    expect(decoded.polygonPoints).toEqual(DEFAULT_POLYGON_POINTS)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

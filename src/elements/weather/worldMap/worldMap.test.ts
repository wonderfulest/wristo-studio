import { describe, expect, it, vi } from 'vitest'
import { projectWorldMapLocation, normalizeWorldMap, worldMapSvg } from './worldMap.model'
import { decodeWorldMap, encodeWorldMap } from './worldMap.encoder'

vi.hoisted(() => {
  for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(globalThis, key, { configurable: true, value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() } })
})

describe('World Map geographic contract', () => {
  const config = { id: 'map', eleType: 'worldMap', left: 227, top: 150, width: 360, height: 180 }
  it('maps Greenwich, poles and the antimeridian without swapping latitude and longitude', () => {
    expect(projectWorldMapLocation(config, 0, 0)).toEqual({ x: 227, y: 150 })
    expect(projectWorldMapLocation(config, 90, -180)).toEqual({ x: 47, y: 60 })
    expect(projectWorldMapLocation(config, -90, 180)).toEqual({ x: 407, y: 240 })
    expect(projectWorldMapLocation(config, 31.2, 121.5)).toEqual({ x: 348.5, y: 118.8 })
  })
  it('follows translated and resized maps', () => {
    expect(projectWorldMapLocation({ ...config, left: 100, top: 80, width: 180, height: 90 }, 0, 90)).toEqual({ x: 145, y: 80 })
  })
  it('hides missing, non-numeric, out-of-range and disabled positions, but allows zero coordinates', () => {
    for (const [lat, lon] of [
      [null, 0],
      [0, null],
      [NaN, 10],
      [91, 0],
      [0, 181],
      ['31', 120],
      [0, Infinity]
    ]) {
      expect(projectWorldMapLocation(config, lat, lon)).toBeNull()
    }
    expect(projectWorldMapLocation({ ...config, showLocation: false }, 0, 0)).toBeNull()
    expect(projectWorldMapLocation(config, 0, 0)).not.toBeNull()
  })
  it('normalizes dimensions, marker size and absent preview coordinates', () => {
    const next = normalizeWorldMap({ ...config, width: -1, height: NaN, markerSize: 100, previewLatitude: null })
    expect(next.width).toBe(24)
    expect(next.height).toBe(160)
    expect(next.markerSize).toBe(30)
    expect(next.previewLatitude).toBeNull()
  })
  it('round trips preview state without exporting Fabric internals and uses the live position', () => {
    const decoded = decodeWorldMap({ ...config, showLocation: true, previewLatitude: 31.2, previewLongitude: 121.5 })
    const encoded = encodeWorldMap({ ...decoded, left: 110, top: 90, scaleX: 2, scaleY: 1.5, __element: { config: decoded }, canvas: {} })
    expect(encoded).toMatchObject({ left: 110, top: 90, width: 720, height: 270, previewLatitude: 31.2, previewLongitude: 121.5 })
    expect(encoded).not.toHaveProperty('canvas')
    expect(encoded).not.toHaveProperty('scaleX')
  })
  it('renders a map-only asset, never baking the simulated location into the map', () => {
    const a = worldMapSvg(normalizeWorldMap({ ...config, previewLatitude: 31.2, previewLongitude: 121.5 }))
    const b = worldMapSvg(normalizeWorldMap({ ...config, previewLatitude: -33, previewLongitude: -70 }))
    expect(a).toBe(b)
    expect(a).toContain('viewBox="0 0 360 180"')
    expect(a).not.toContain('#ff8800')
  })
})

// Fabric geometry checks use the actual group builder, including fixed bounds.
describe('World Map canvas geometry', () => {
  it('preserves display states before registering the canvas layer', async () => {
    const { createWorldMapGroup } = await import('./worldMap.renderer')
    const group = createWorldMapGroup(normalizeWorldMap({ displayStates: { active: true, ambient: false } }))
    expect((group as any).displayStates).toEqual({ active: true, ambient: false })
  })
  it('accepts Vue reactive configs from the settings panel', async () => {
    const { reactive } = await import('vue')
    const { createWorldMapGroup } = await import('./worldMap.renderer')
    const config = reactive(normalizeWorldMap({}))
    expect(() => createWorldMapGroup(config)).not.toThrow()
  })
  it('keeps the map frame stable when the marker moves to an edge or is hidden', async () => {
    const { createWorldMapGroup } = await import('./worldMap.renderer')
    for (const overrides of [{ previewLatitude: 0, previewLongitude: 0 }, { previewLatitude: 90, previewLongitude: -180 }, { showLocation: false }]) {
      const config = normalizeWorldMap({ left: 227, top: 120, width: 320, height: 160, ...overrides })
      const group = createWorldMapGroup(config)
      expect(group.width).toBe(320)
      expect(group.height).toBe(160)
      expect(group.left).toBe(227)
      expect(group.top).toBe(120)
      expect(group.getObjects()).toHaveLength(config.showLocation ? 5 : 3)
      if (config.showLocation) {
        const dot = group.getObjects().at(-1)!
        const expected = projectWorldMapLocation(config, config.previewLatitude, config.previewLongitude)!
        expect(dot.left).toBeCloseTo(expected.x - config.left, 5)
        expect(dot.top).toBeCloseTo(expected.y - config.top, 5)
      }
    }
  })
})

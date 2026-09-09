import type { WorldMapElementConfig } from '@/types/elements/worldMap'
import mapData from './world-map-data.json'

export { mapData as worldMapData }
export const WORLD_MAP_COLOR = '#84c7ef'
export const WORLD_MAP_GRID_COLOR = '#20342f'
const bounded = (value: unknown, fallback: number, min: number, max: number) => (typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback)
const coordinate = (value: unknown, limit: number): number | null => (typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit ? value : null)

export function normalizeWorldMap(input: Record<string, any>): WorldMapElementConfig {
  return {
    id: String(input.id ?? ''),
    eleType: 'worldMap',
    left: bounded(input.left, 227, -9999, 9999),
    top: bounded(input.top, 130, -9999, 9999),
    originX: 'center',
    originY: 'center',
    width: bounded(input.width, 320, 24, 2000),
    height: bounded(input.height, 160, 12, 2000),
    showLocation: input.showLocation !== false,
    markerColor: typeof input.markerColor === 'string' && /^#[0-9a-f]{6}$/i.test(input.markerColor) ? input.markerColor : '#ff8800',
    markerSize: bounded(input.markerSize, 10, 4, 30),
    mapOpacity: bounded(input.mapOpacity, 1, 0, 1),
    previewLatitude: coordinate(input.previewLatitude === undefined ? 31.2 : input.previewLatitude, 90),
    previewLongitude: coordinate(input.previewLongitude === undefined ? 121.5 : input.previewLongitude, 180),
    ...(input.layerName !== undefined ? { layerName: input.layerName } : {}),
    ...(input.displayStates ? { displayStates: input.displayStates } : {}),
    ...(input.visibility ? { visibility: input.visibility } : {})
  }
}

/** Position is [latitude, longitude], using the full-world equirectangular map. */
export function projectWorldMapLocation(input: Record<string, any>, latitude: unknown, longitude: unknown): { x: number; y: number } | null {
  const c = normalizeWorldMap(input)
  const lat = coordinate(latitude, 90),
    lon = coordinate(longitude, 180)
  if (!c.showLocation || lat === null || lon === null) return null
  return { x: c.left + (lon / 360) * c.width, y: c.top - (lat / 180) * c.height }
}

/** Map-only artwork; simulated coordinates are never baked into exported assets. */
export function worldMapSvg(config: WorldMapElementConfig): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${config.width}" height="${config.height}" viewBox="0 0 360 180" preserveAspectRatio="none"><g opacity="${config.mapOpacity}"><path d="${mapData.gridPath}" fill="none" stroke="${WORLD_MAP_GRID_COLOR}" stroke-width="0.5"/><path d="${mapData.landPath}" fill="${WORLD_MAP_COLOR}"/></g></svg>`
}

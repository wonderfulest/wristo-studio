import { normalizeWorldMap } from './worldMap.model'
import type { WorldMapElementConfig } from '@/types/elements/worldMap'

export const decodeWorldMap = (config: Record<string, any>): WorldMapElementConfig => normalizeWorldMap(config)
export function encodeWorldMap(element: Record<string, any>): WorldMapElementConfig {
  const source = element.__element?.config ?? element
  return normalizeWorldMap({
    ...source,
    left: element.left ?? source.left,
    top: element.top ?? source.top,
    width: source.width * Math.abs(element.scaleX ?? 1),
    height: source.height * Math.abs(element.scaleY ?? 1)
  })
}

import type { ElementType } from '@/types/element'
import { clonePolygonPoints, DEFAULT_POLYGON_POINTS } from './polygon.geometry'

export const polygonSchema = {
  type: 'polygon' as ElementType,
  name: 'Polygon',
  icon: 'mdi:hexagon-outline',
  defaultConfig: {
    width: 100,
    height: 100,
    polygonPoints: clonePolygonPoints(DEFAULT_POLYGON_POINTS),
    fill: 'transparent',
    stroke: '#FFFFFF',
    strokeWidth: 2,
    opacity: 1,
    gradientEnabled: false,
    gradientStartColor: '#FFFFFF',
    gradientEndColor: '#FFFFFF',
    gradientDirection: 'leftToRight' as const,
  },
  resizable: true,
  rotatable: false,
}

import type { BaseElementConfig } from './base'

export interface WorldMapElementConfig extends BaseElementConfig {
  eleType: 'worldMap'
  width: number
  height: number
  showLocation: boolean
  markerColor: string
  markerSize: number
  mapOpacity: number
  previewLatitude: number | null
  previewLongitude: number | null
}

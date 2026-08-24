import type { BaseElementConfig } from './base'
import type { SunEventPhaseStyle } from '@/elements/sunEvents/common/sunEvents.model'

export type SunEventsDisplayMode = 'phases' | 'simple'

export type SunEventIndicatorBase = {
  imageSvg: string
  imageUrl?: string
  assetId?: number
  width: number
  height: number
  nightDotColor?: string
}

type SunEventsDisplayConfig = {
  displayMode?: SunEventsDisplayMode
  simpleColor?: string
}

export type CurveIndicatorOrientation = 'fixed' | 'tangent'

export interface ArcSunEventsElementConfig extends BaseElementConfig, SunEventsDisplayConfig {
  eleType: 'arcSunEvents'
  centerX?: number
  centerY?: number
  radius: number
  strokeWidth: number
  startAngle: number
  angleRange: number
  counterClockwise: boolean
  phases: SunEventPhaseStyle[]
  indicator: SunEventIndicatorBase & {
    radialOffset: number
    orientation: 'fixed' | 'inward' | 'outward'
  }
}

export interface LineSunEventsElementConfig extends BaseElementConfig, SunEventsDisplayConfig {
  eleType: 'lineSunEvents'
  length: number
  strokeWidth: number
  angle: number
  phases: SunEventPhaseStyle[]
  indicator: SunEventIndicatorBase & {
    offset: number
  }
}

export interface CurveSunEventsElementConfig extends BaseElementConfig, SunEventsDisplayConfig {
  eleType: 'curveSunEvents'
  width: number
  height: number
  strokeWidth: number
  angle: number
  phases: SunEventPhaseStyle[]
  indicator: SunEventIndicatorBase & {
    normalOffset: number
    orientation: CurveIndicatorOrientation
  }
}

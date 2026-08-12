import { timeFractionToArcAngle } from './sunEvents.model'
import type { ArcSunEventsElementConfig, LineSunEventsElementConfig, SunEventIndicatorBase } from '@/types/elements/sunEvents'

export type ArcIndicatorOrientation = 'fixed' | 'inward' | 'outward'

export function resolveSunEventIndicatorSource(indicator: Partial<SunEventIndicatorBase> | undefined): string | undefined {
  return indicator?.imageSvg || indicator?.imageUrl
}

export function scaleArcSunEventsConfig(
  config: ArcSunEventsElementConfig,
  scale: number,
  left: number,
  top: number,
): ArcSunEventsElementConfig {
  const safeScale = Number.isFinite(scale) ? Math.max(0.0001, Math.abs(scale)) : 1
  const scaled = (value: number, minimum = 0) => Math.max(minimum, Math.round(Number(value || 0) * safeScale))
  return {
    ...config,
    left: Math.round(left),
    top: Math.round(top),
    radius: scaled(config.radius, 1),
    strokeWidth: scaled(config.strokeWidth, 1),
    indicator: {
      ...config.indicator,
      width: scaled(config.indicator.width, 1),
      height: scaled(config.indicator.height, 1),
      radialOffset: Math.round(Number(config.indicator.radialOffset || 0) * safeScale),
    },
  }
}

export function scaleLineSunEventsConfig(
  config: LineSunEventsElementConfig,
  scaleX: number,
  scaleY: number,
  left: number,
  top: number,
): LineSunEventsElementConfig {
  const safeScaleX = Number.isFinite(scaleX) ? Math.max(0.0001, Math.abs(scaleX)) : 1
  const safeScaleY = Number.isFinite(scaleY) ? Math.max(0.0001, Math.abs(scaleY)) : 1
  return {
    ...config,
    left: Math.round(left),
    top: Math.round(top),
    length: Math.max(1, Math.round(Number(config.length || 0) * safeScaleX)),
    strokeWidth: Math.max(1, Math.round(Number(config.strokeWidth || 0) * safeScaleY)),
    indicator: {
      ...config.indicator,
      offset: Math.round(Number(config.indicator.offset || 0) * safeScaleY),
    },
  }
}

export function arcIndicatorTransform(input: {
  fraction: number
  centerX: number
  centerY: number
  radius: number
  radialOffset: number
  startAngle: number
  angleRange: number
  counterClockwise: boolean
  orientation: ArcIndicatorOrientation
}): { x: number; y: number; angle: number } {
  const angle = timeFractionToArcAngle(input.fraction, input.startAngle, input.angleRange, input.counterClockwise)
  const radians = angle * Math.PI / 180
  const distance = input.radius + input.radialOffset
  const orientation = input.orientation === 'fixed'
    ? 0
    : input.orientation === 'outward'
      ? ((angle + 90) % 360 + 360) % 360
      : ((angle - 90) % 360 + 360) % 360
  return {
    x: Math.round((input.centerX + Math.cos(radians) * distance) * 1e6) / 1e6,
    y: Math.round((input.centerY + Math.sin(radians) * distance) * 1e6) / 1e6,
    angle: orientation,
  }
}

export function lineIndicatorTransform(input: { fraction: number; length: number; offset: number }): { x: number; y: number } {
  const fraction = Math.max(0, Math.min(1, input.fraction))
  return { x: -input.length / 2 + input.length * fraction, y: input.offset }
}

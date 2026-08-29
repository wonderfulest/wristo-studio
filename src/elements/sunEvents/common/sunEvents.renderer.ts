import { Circle, Group, Image as FabricImage, Line, Path, Rect, type FabricObject } from 'fabric'
import type { ArcSunEventsElementConfig, CurveSunEventsElementConfig, LineSunEventsElementConfig, SunEventIndicatorBase } from '@/types/elements/sunEvents'
import { normalizeSunEventSegments, timeFractionToArcAngle, type SunEventSegment } from './sunEvents.model'
import {
  arcIndicatorTransform,
  curveIndicatorTransform,
  curveQuadraticPieces,
  lineIndicatorTransform,
  resolveSunEventIndicatorSource,
} from './sunEvents.geometry'
import { currentLocalDayFraction, SUN_EVENTS_PREVIEW_TIMES } from './sunEvents.preview'
import { DEFAULT_SUN_EVENT_INDICATOR_SVG, DEFAULT_SUN_EVENTS_SIMPLE_COLOR } from './sunEvents.defaults'

type Point = { x: number; y: number }

function circleCenterOffset(objects: FabricObject[]): Point {
  if (objects.length === 0) return { x: 0, y: 0 }
  const bounds = objects.map((object) => object.getBoundingRect())
  const left = Math.min(...bounds.map((bound) => bound.left))
  const top = Math.min(...bounds.map((bound) => bound.top))
  const right = Math.max(...bounds.map((bound) => bound.left + bound.width))
  const bottom = Math.max(...bounds.map((bound) => bound.top + bound.height))
  return { x: -(left + right) / 2, y: -(top + bottom) / 2 }
}

export function setArcSunEventsCenterOffset(group: FabricObject, objects: FabricObject[]): void {
  ;(group as any).__sunEventsCenterOffset = circleCenterOffset(objects)
}

function polar(radius: number, angle: number): { x: number; y: number } {
  const radians = angle * Math.PI / 180
  return { x: Math.cos(radians) * radius, y: Math.sin(radians) * radius }
}

function arcPath(radius: number, startAngle: number, endAngle: number, counterClockwise: boolean): string {
  const start = polar(radius, startAngle)
  const end = polar(radius, endAngle)
  const span = Math.abs(endAngle - startAngle)
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${span > 180 ? 1 : 0} ${counterClockwise ? 0 : 1} ${end.x} ${end.y}`
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = url
  })
}

function createDefaultSunIndicator(width: number, height: number): Group {
  const color = '#FFD54A'
  const rayOptions = {
    stroke: color,
    strokeWidth: 2.4,
    strokeLineCap: 'round' as const,
    selectable: false,
    evented: false,
  }
  const rayPoints: [number, number, number, number][] = [
    [15, 2.5, 15, 5.5], [15, 24.5, 15, 27.5],
    [2.5, 15, 5.5, 15], [24.5, 15, 27.5, 15],
    [6.16, 6.16, 8.28, 8.28], [21.72, 21.72, 23.84, 23.84],
    [23.84, 6.16, 21.72, 8.28], [8.28, 21.72, 6.16, 23.84],
  ]
  const rays = rayPoints.map((points) => new Line(points, rayOptions))
  const sun = new Group([
    ...rays,
    new Circle({
      left: 15, top: 15, radius: 6.5, fill: color,
      originX: 'center', originY: 'center', selectable: false, evented: false,
    }),
  ], {
    originX: 'center', originY: 'center', selectable: false, evented: false,
    objectCaching: false,
  })
  sun.set({
    scaleX: Math.max(1, width) / Math.max(1, sun.width),
    scaleY: Math.max(1, height) / Math.max(1, sun.height),
  })
  return sun
}

async function createIndicator(url: string | undefined, width: number, height: number): Promise<FabricObject | null> {
  if (!url) return null
  if (url === DEFAULT_SUN_EVENT_INDICATOR_SVG) return createDefaultSunIndicator(width, height)
  const htmlImage = await loadHtmlImage(url)
  const naturalWidth = Math.max(1, htmlImage.naturalWidth || htmlImage.width || 1)
  const naturalHeight = Math.max(1, htmlImage.naturalHeight || htmlImage.height || 1)
  return new FabricImage(htmlImage, {
    originX: 'center', originY: 'center', width: naturalWidth, height: naturalHeight,
    scaleX: Math.max(1, width) / naturalWidth, scaleY: Math.max(1, height) / naturalHeight,
    selectable: false, evented: false,
  })
}

function trackSegments(
  config: ArcSunEventsElementConfig | CurveSunEventsElementConfig | LineSunEventsElementConfig,
): SunEventSegment[] {
  if (config.displayMode === 'simple') {
    return [{ start: 0, end: 1, color: config.simpleColor || DEFAULT_SUN_EVENTS_SIMPLE_COLOR, phase: 'midnight' }]
  }
  return normalizeSunEventSegments({ styles: config.phases, events: SUN_EVENTS_PREVIEW_TIMES })
}

async function createCurrentTimeIndicator(indicator: SunEventIndicatorBase): Promise<FabricObject | null> {
  return createIndicator(resolveSunEventIndicatorSource(indicator), indicator.width, indicator.height)
}

export async function buildArcSunEventObjects(config: ArcSunEventsElementConfig, previewTime?: Date): Promise<FabricObject[]> {
  const segments = trackSegments(config)
  const objects: FabricObject[] = []
  for (const segment of segments) {
    const pieces = segment.end - segment.start >= 0.999
      ? [[segment.start, 0.5], [0.5, segment.end]]
      : [[segment.start, segment.end]]
    for (const [start, end] of pieces) {
      objects.push(new Path(arcPath(
        config.radius,
        timeFractionToArcAngle(start, config.startAngle, config.angleRange, config.counterClockwise),
        timeFractionToArcAngle(end, config.startAngle, config.angleRange, config.counterClockwise),
        config.counterClockwise,
      ), {
        fill: '', stroke: segment.color, strokeWidth: config.strokeWidth,
        strokeLineCap: 'butt', selectable: false, evented: false,
      }))
    }
  }
  const fraction = currentLocalDayFraction(previewTime)
  const indicator = await createCurrentTimeIndicator(config.indicator)
  if (indicator) {
    const transform = arcIndicatorTransform({
      fraction, centerX: 0, centerY: 0,
      radius: config.radius, radialOffset: config.indicator.radialOffset,
      startAngle: config.startAngle, angleRange: config.angleRange,
      counterClockwise: config.counterClockwise, orientation: config.indicator.orientation,
    })
    indicator.set({ left: transform.x, top: transform.y, angle: transform.angle })
    objects.push(indicator)
  }
  return objects
}

export async function buildLineSunEventObjects(config: LineSunEventsElementConfig, previewTime?: Date): Promise<FabricObject[]> {
  const segments = trackSegments(config)
  const objects: FabricObject[] = segments.map((segment) => {
    const width = Math.max(0.5, (segment.end - segment.start) * config.length)
    return new Rect({
      left: -config.length / 2 + segment.start * config.length + width / 2,
      top: 0, width, height: config.strokeWidth, fill: segment.color,
      originX: 'center', originY: 'center', selectable: false, evented: false,
    })
  })
  const fraction = currentLocalDayFraction(previewTime)
  const indicator = await createCurrentTimeIndicator(config.indicator)
  if (indicator) {
    const transform = lineIndicatorTransform({
      fraction, length: config.length, offset: config.indicator.offset,
    })
    indicator.set({ left: transform.x, top: transform.y })
    objects.push(indicator)
  }
  return objects
}

export async function buildCurveSunEventObjects(config: CurveSunEventsElementConfig, previewTime?: Date): Promise<FabricObject[]> {
  const segments = trackSegments(config)
  const objects: FabricObject[] = []
  for (const segment of segments) {
    for (const piece of curveQuadraticPieces(segment.start, segment.end, config.width, config.height)) {
      objects.push(new Path(
        `M ${piece.start.x} ${piece.start.y} Q ${piece.control.x} ${piece.control.y} ${piece.end.x} ${piece.end.y}`,
        {
          fill: '', stroke: segment.color, strokeWidth: config.strokeWidth,
          strokeLineCap: 'butt', selectable: false, evented: false,
        },
      ))
    }
  }
  const fraction = currentLocalDayFraction(previewTime)
  const indicator = await createCurrentTimeIndicator(config.indicator)
  if (indicator) {
    const transform = curveIndicatorTransform({
      fraction,
      width: config.width,
      height: config.height,
      normalOffset: config.indicator.normalOffset,
      orientation: config.indicator.orientation,
    })
    indicator.set({ left: transform.x, top: transform.y, angle: transform.angle })
    objects.push(indicator)
  }
  return objects
}

export function createSunEventsGroup(
  objects: FabricObject[],
  config: ArcSunEventsElementConfig | CurveSunEventsElementConfig | LineSunEventsElementConfig,
): Group {
  const centerOffset = config.eleType === 'arcSunEvents' ? circleCenterOffset(objects) : undefined
  const group = new Group(objects, {
    id: config.id, eleType: config.eleType, left: config.left, top: config.top,
    angle: config.eleType === 'arcSunEvents' ? 0 : config.angle,
    originX: 'center', originY: 'center', objectCaching: false,
  } as any)
  if (centerOffset) (group as any).__sunEventsCenterOffset = centerOffset
  ;(group as any).__element = { config: structuredClone({
    ...config,
    ...(centerOffset
      ? { centerX: config.left + centerOffset.x, centerY: config.top + centerOffset.y }
      : {}),
  }) }
  return group
}

import type { SubDialContentConfig, SubDialContentKey } from '@/types/elements/subDial'
import { subDialSchema } from './subDial.schema'

export interface NormalizedPoint {
  x: number
  y: number
}

export interface CanvasPoint {
  x: number
  y: number
}

export interface SubDialTransform {
  centerX: number
  centerY: number
  radius: number
  rotation: number
}

export interface ContentBounds {
  width: number
  height: number
}

export type SubDialLayoutPreset = 'classic' | 'compact' | 'goalFocus'

type LayoutValue = Pick<SubDialContentConfig[SubDialContentKey], 'x' | 'y' | 'visible'>
type Layout = Record<SubDialContentKey, LayoutValue>

const contentKeys: SubDialContentKey[] = ['icon', 'label', 'value', 'unit', 'goalValue', 'percentage']

const compactLayout: Layout = {
  icon: { x: -0.38, y: -0.36, visible: true },
  label: { x: 0, y: 0.46, visible: true },
  value: { x: 0, y: 0, visible: true },
  unit: { x: 0.42, y: 0, visible: false },
  goalValue: { x: -0.3, y: 0.62, visible: false },
  percentage: { x: 0.3, y: 0.62, visible: false }
}

const goalFocusLayout: Layout = {
  icon: { x: 0, y: -0.72, visible: false },
  label: { x: 0, y: -0.5, visible: true },
  value: { x: 0, y: -0.08, visible: true },
  unit: { x: 0.42, y: -0.08, visible: true },
  goalValue: { x: -0.3, y: 0.48, visible: true },
  percentage: { x: 0.3, y: 0.48, visible: true }
}

function assertFinitePoint(point: NormalizedPoint | CanvasPoint, name: string): void {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`${name} must contain finite x and y coordinates`)
  }
}

function assertTransform(transform: SubDialTransform): void {
  if (!transform || !Number.isFinite(transform.centerX) || !Number.isFinite(transform.centerY) || !Number.isFinite(transform.rotation) || !Number.isFinite(transform.radius) || transform.radius <= 0) {
    throw new Error('Sub-dial transform must have finite values and a radius greater than zero')
  }
}

export function localToCanvas(point: NormalizedPoint, transform: SubDialTransform): CanvasPoint {
  assertFinitePoint(point, 'Local point')
  assertTransform(transform)
  const radians = (transform.rotation * Math.PI) / 180
  const localX = point.x * transform.radius
  const localY = point.y * transform.radius
  return {
    x: transform.centerX + localX * Math.cos(radians) - localY * Math.sin(radians),
    y: transform.centerY + localX * Math.sin(radians) + localY * Math.cos(radians)
  }
}

export function canvasToLocal(point: CanvasPoint, transform: SubDialTransform): NormalizedPoint {
  assertFinitePoint(point, 'Canvas point')
  assertTransform(transform)
  const radians = (-transform.rotation * Math.PI) / 180
  const offsetX = point.x - transform.centerX
  const offsetY = point.y - transform.centerY
  return {
    x: (offsetX * Math.cos(radians) - offsetY * Math.sin(radians)) / transform.radius,
    y: (offsetX * Math.sin(radians) + offsetY * Math.cos(radians)) / transform.radius
  }
}

export function constrainContentPosition(target: NormalizedPoint, bounds: ContentBounds, radius: number): NormalizedPoint {
  assertFinitePoint(target, 'Target point')
  if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height) || bounds.width < 0 || bounds.height < 0) {
    throw new Error('Content bounds must have finite, non-negative dimensions')
  }
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new Error('Sub-dial radius must be finite and greater than zero')
  }

  const safePixelRadius = radius - Math.hypot(bounds.width / 2, bounds.height / 2)
  if (safePixelRadius <= 0) return { x: 0, y: 0 }

  const safeNormalizedRadius = safePixelRadius / radius
  const distance = Math.hypot(target.x, target.y)
  if (distance <= safeNormalizedRadius) return { x: target.x, y: target.y }
  const scale = safeNormalizedRadius / distance
  return { x: target.x * scale, y: target.y * scale }
}

export function lockDragAxis(start: CanvasPoint, current: CanvasPoint, shiftKey: boolean): CanvasPoint {
  assertFinitePoint(start, 'Drag start')
  assertFinitePoint(current, 'Current drag point')
  if (!shiftKey) return { x: current.x, y: current.y }

  const deltaX = current.x - start.x
  const deltaY = current.y - start.y
  return Math.abs(deltaX) >= Math.abs(deltaY) ? { x: current.x, y: start.y } : { x: start.x, y: current.y }
}

function classicLayout(): Layout {
  return Object.fromEntries(
    contentKeys.map((key) => {
      const item = subDialSchema.defaultConfig.content[key]
      return [key, { x: item.x, y: item.y, visible: item.visible }]
    })
  ) as unknown as Layout
}

export function applySubDialLayoutPreset(content: SubDialContentConfig, preset: SubDialLayoutPreset): SubDialContentConfig {
  if (!content || contentKeys.some((key) => !content[key])) throw new Error('A complete sub-dial content config is required')

  const layout = preset === 'classic' ? classicLayout() : preset === 'compact' ? compactLayout : preset === 'goalFocus' ? goalFocusLayout : null
  if (!layout) throw new Error(`Unknown sub-dial layout preset: ${String(preset)}`)

  return Object.fromEntries(contentKeys.map((key) => [key, { ...content[key], ...layout[key] }])) as unknown as SubDialContentConfig
}

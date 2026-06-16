import type { Canvas } from 'fabric'
import type { RuntimeDesignConfig } from '@/types/app/config'
import type { AnyElementConfig } from '@/types/elements'
import { normalizeFontSizeToOption } from '@/utils/fontSize'

export const STANDARD_DESIGN_SIZE = 454

export interface DesignSize {
  width: number
  height: number
}

const X_FIELDS = new Set(['left', 'x', 'x1', 'x2', 'scrollAreaLeft'])
const Y_FIELDS = new Set(['top', 'y', 'y1', 'y2', 'topBase', 'scrollAreaTop'])
const WIDTH_FIELDS = new Set(['width', 'scrollAreaWidth', 'headWidth', 'barWidth'])
const HEIGHT_FIELDS = new Set(['height', 'headHeight'])
const SCALAR_FIELDS = new Set([
  'size',
  'iconSize',
  'fontSize',
  'fontGap',
  'radius',
  'bgRadius',
  'strokeWidth',
  'bgStrokeWidth',
  'borderRadius',
  'borderWidth',
  'padding',
  'gap',
  'separator',
  'lineWidth',
  'pointRadius',
  'bodyStrokeWidth',
  'bodyRx',
  'bodyRy',
  'headRx',
  'headRy',
  'headGap',
])
const UNIFORM_SIZE_ELEMENT_TYPES = new Set(['image'])

function safeRatio(next: number, prev: number): number {
  if (!Number.isFinite(next) || !Number.isFinite(prev) || prev === 0) return 1
  return next / prev
}

function scaleNumeric(value: unknown, ratio: number): unknown {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value
  return value * ratio
}

function roundScaledNumber(value: unknown): unknown {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value
  return Number(value.toFixed(3))
}

function normalizeScaledFontSize(value: unknown): unknown {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value
  return normalizeFontSizeToOption(value)
}

export function scaleElementConfig(
  config: AnyElementConfig,
  from: DesignSize,
  to: DesignSize,
): AnyElementConfig {
  const ratioX = safeRatio(to.width, from.width)
  const ratioY = safeRatio(to.height, from.height)
  const ratioScalar = Math.min(ratioX, ratioY)
  const next = { ...(config as unknown as Record<string, unknown>) }
  const shouldKeepUniformSize = UNIFORM_SIZE_ELEMENT_TYPES.has(String(next.eleType ?? ''))

  for (const key of Object.keys(next)) {
    if (X_FIELDS.has(key)) {
      next[key] = scaleNumeric(next[key], ratioX)
    } else if (Y_FIELDS.has(key)) {
      next[key] = scaleNumeric(next[key], ratioY)
    } else if (WIDTH_FIELDS.has(key)) {
      next[key] = scaleNumeric(next[key], shouldKeepUniformSize ? ratioScalar : ratioX)
    } else if (HEIGHT_FIELDS.has(key)) {
      next[key] = scaleNumeric(next[key], shouldKeepUniformSize ? ratioScalar : ratioY)
    } else if (SCALAR_FIELDS.has(key)) {
      next[key] = scaleNumeric(next[key], ratioScalar)
    }
  }

  for (const key of Object.keys(next)) {
    next[key] = roundScaledNumber(next[key])
  }
  if ('fontSize' in next) {
    next.fontSize = normalizeScaledFontSize(next.fontSize)
  }
  if ('iconSize' in next && 'fontSize' in next) {
    next.iconSize = next.fontSize
  }

  return next as unknown as AnyElementConfig
}

function scaleImageObject(obj: any, from: DesignSize, to: DesignSize): void {
  const ratioX = safeRatio(to.width, from.width)
  const ratioY = safeRatio(to.height, from.height)
  const ratioScalar = Math.min(ratioX, ratioY)

  scaleObjectNumber(obj, 'left', ratioX)
  scaleObjectNumber(obj, 'top', ratioY)
  scaleObjectNumber(obj, 'scaleX', ratioScalar)
  scaleObjectNumber(obj, 'scaleY', ratioScalar)

  if (obj?.__element?.config) {
    obj.__element.config = scaleElementConfig(obj.__element.config, from, to)
  }
}

export function normalizeConfigToStandardSize(
  config: RuntimeDesignConfig,
  currentSize: DesignSize,
): RuntimeDesignConfig {
  if (
    currentSize.width === STANDARD_DESIGN_SIZE &&
    currentSize.height === STANDARD_DESIGN_SIZE
  ) {
    return config
  }

  return {
    ...config,
    elements: config.elements.map((element) =>
      scaleElementConfig(element, currentSize, {
        width: STANDARD_DESIGN_SIZE,
        height: STANDARD_DESIGN_SIZE,
      }),
    ),
  }
}

function scaleObjectNumber(obj: any, key: string, ratio: number): boolean {
  const value = obj?.[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) return false
  const nextValue = key === 'fontSize'
    ? normalizeScaledFontSize(value * ratio)
    : value * ratio
  obj.set?.(key, nextValue)
  return true
}

function scaleKnownObjectFields(obj: any, from: DesignSize, to: DesignSize): boolean {
  const ratioX = safeRatio(to.width, from.width)
  const ratioY = safeRatio(to.height, from.height)
  const ratioScalar = Math.min(ratioX, ratioY)
  let changed = false

  X_FIELDS.forEach((key) => { changed = scaleObjectNumber(obj, key, ratioX) || changed })
  Y_FIELDS.forEach((key) => { changed = scaleObjectNumber(obj, key, ratioY) || changed })
  WIDTH_FIELDS.forEach((key) => { changed = scaleObjectNumber(obj, key, ratioX) || changed })
  HEIGHT_FIELDS.forEach((key) => { changed = scaleObjectNumber(obj, key, ratioY) || changed })
  SCALAR_FIELDS.forEach((key) => { changed = scaleObjectNumber(obj, key, ratioScalar) || changed })

  if (obj?.__element?.config) {
    obj.__element.config = scaleElementConfig(obj.__element.config, from, to)
    changed = true
  }

  return changed
}

function scaleBackgroundObject(obj: any, from: DesignSize, to: DesignSize): void {
  const ratioX = safeRatio(to.width, from.width)
  const ratioY = safeRatio(to.height, from.height)

  scaleObjectNumber(obj, 'left', ratioX)
  scaleObjectNumber(obj, 'top', ratioY)
  scaleObjectNumber(obj, 'scaleX', ratioX)
  scaleObjectNumber(obj, 'scaleY', ratioY)

  if (obj?.__element?.config) {
    obj.__element.config = scaleElementConfig(obj.__element.config, from, to)
  }
}

export function scaleFabricCanvasForDesignSize(
  canvas: Canvas | null,
  from: DesignSize,
  to: DesignSize,
): void {
  if (!canvas || (from.width === to.width && from.height === to.height)) return

  const ratioX = safeRatio(to.width, from.width)
  const ratioY = safeRatio(to.height, from.height)
  const objects = canvas.getObjects?.() ?? []

  for (const obj of objects as any[]) {
    if (!obj || obj.eleType === 'global') continue

    if (obj.eleType === 'background') {
      scaleBackgroundObject(obj, from, to)
      obj.setCoords?.()
      continue
    }

    if (obj.eleType === 'image') {
      scaleImageObject(obj, from, to)
      obj.setCoords?.()
      continue
    }

    let changed = scaleKnownObjectFields(obj, from, to)

    const children = typeof obj.getObjects === 'function' ? obj.getObjects() : []
    for (const child of children) {
      changed = scaleKnownObjectFields(child, from, to) || changed
    }

    if (!changed) {
      const nextScaleX = Number(obj.scaleX ?? 1) * ratioX
      const nextScaleY = Number(obj.scaleY ?? 1) * ratioY
      obj.set?.({
        scaleX: nextScaleX,
        scaleY: nextScaleY,
      })
    }

    obj.setCoords?.()
  }

  canvas.requestRenderAll?.()
}

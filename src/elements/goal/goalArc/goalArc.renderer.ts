import { Circle, Group } from 'fabric'
import type { FabricElement } from '@/types/element'
import type { GoalArcElementConfig } from '@/types/elements/goal'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { ensureGoalElementId, clampProgress } from '@/elements/goal/goal.common'
import { encodeGoalArc } from '@/elements/goal/goalArc/goalArc.encoder'
import { applyControlsToObject } from '@/utils/controlManager'

const GOAL_ARC_DEBUG = false
const normalizeEndCap = (value: unknown): 'round' | 'butt' => value === 'round' ? 'round' : 'butt'
const GRADIENT_ARC_STEP_DEGREES = 4
const MAX_GRADIENT_ARC_SEGMENTS = 90

function normalizeGradientColor(value: unknown): string | null {
  const raw = String(value ?? '').trim()
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toUpperCase()
  if (/^0x[0-9a-f]{6}$/i.test(raw)) return `#${raw.slice(2).toUpperCase()}`
  return null
}

function getGradientColors(config: GoalArcElementConfig): { start: string; end: string } | null {
  if (!config.gradientEnabled) return null
  const start = normalizeGradientColor(config.gradientStartColor)
  const end = normalizeGradientColor(config.gradientEndColor)
  return start && end ? { start, end } : null
}

function interpolateColor(start: string, end: string, position: number): string {
  const t = Math.max(0, Math.min(1, position))
  const startValue = Number.parseInt(start.slice(1), 16)
  const endValue = Number.parseInt(end.slice(1), 16)
  const channel = (shift: number) => Math.round(
    ((startValue >> shift) & 0xff) + (((endValue >> shift) & 0xff) - ((startValue >> shift) & 0xff)) * t,
  )
  return `#${[channel(16), channel(8), channel(0)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`
}

function numberOrNull(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : null
}

function objectDebugSnapshot(obj: any) {
  if (!obj) return null
  let bounds: any = null
  try {
    bounds = obj.getBoundingRect?.()
  } catch {
    bounds = null
  }
  return {
    id: obj.id,
    type: obj.type,
    left: numberOrNull(obj.left),
    top: numberOrNull(obj.top),
    width: numberOrNull(obj.width),
    height: numberOrNull(obj.height),
    scaleX: numberOrNull(obj.scaleX),
    scaleY: numberOrNull(obj.scaleY),
    radius: numberOrNull(obj.radius),
    strokeWidth: numberOrNull(obj.strokeWidth),
    startAngle: numberOrNull(obj.startAngle),
    endAngle: numberOrNull(obj.endAngle),
    visible: obj.visible,
    opacity: numberOrNull(obj.opacity),
    originX: obj.originX,
    originY: obj.originY,
    bounds: bounds
      ? {
          left: numberOrNull(bounds.left),
          top: numberOrNull(bounds.top),
          width: numberOrNull(bounds.width),
          height: numberOrNull(bounds.height),
        }
      : null,
  }
}

function groupDebugSnapshot(group: Group) {
  const anyGroup = group as any
  return {
    group: objectDebugSnapshot(anyGroup),
    own: {
      aCoords: anyGroup.aCoords
        ? Object.fromEntries(Object.entries(anyGroup.aCoords).map(([key, value]: [string, any]) => [
            key,
            { x: numberOrNull(value?.x), y: numberOrNull(value?.y) },
          ]))
        : null,
      objectCount: anyGroup.getObjects?.().length ?? null,
    },
    children: (anyGroup.getObjects?.() ?? []).map((obj: any) => objectDebugSnapshot(obj)),
  }
}

function debugGoalArc(label: string, payload: Record<string, unknown> = {}) {
  if (!GOAL_ARC_DEBUG) return
  console.groupCollapsed(`[goalArc] ${label}`)
  Object.entries(payload).forEach(([key, value]) => {
    console.log(key, value)
  })
  console.groupEnd()
}

function refreshGroup(group: Group) {
  debugGoalArc('refreshGroup:before', { snapshot: groupDebugSnapshot(group) })
  ;(group as any)._calcBounds?.()
  debugGoalArc('refreshGroup:after _calcBounds', { snapshot: groupDebugSnapshot(group) })
  ;(group as any)._updateObjectsCoords?.()
  debugGoalArc('refreshGroup:after _updateObjectsCoords', { snapshot: groupDebugSnapshot(group) })
  ;(group as any)._onAfterObjectsChange?.()
  debugGoalArc('refreshGroup:after _onAfterObjectsChange', { snapshot: groupDebugSnapshot(group) })
  group.setCoords()
  debugGoalArc('refreshGroup:after setCoords', { snapshot: groupDebugSnapshot(group) })
}

function installGoalArcRenderer(group: Group) {
  const anyGroup = group as any
  if (anyGroup.__goalArcDrawObjectInstalled) return
  const originalDrawObject = anyGroup.drawObject?.bind(group)
  anyGroup.__goalArcOriginalDrawObject = originalDrawObject
  anyGroup.__goalArcDrawObjectInstalled = true
  anyGroup.drawObject = (ctx: CanvasRenderingContext2D, forClipping?: boolean, context?: any) => {
    originalDrawObject?.(ctx, forClipping, context)
    const config = getConfig(group) as GoalArcElementConfig | undefined
    if (forClipping || !config) return
    if (config.segmentMode) {
      drawSegmentedGoalArc(ctx, config)
    } else if (getGradientColors(config)) {
      drawContinuousGradientGoalArc(ctx, config)
    }
  }
}

function attachWidget(group: Group, payload: any) {
  ;(group as any).__element = {
    kind: 'widget',
    ...payload,
  }
}

function getElement(group: Group): any {
  return (group as any).__element
}

function getConfig(group: Group): any | undefined {
  return getElement(group)?.config
}

function getChild(group: Group, key: string): any | undefined {
  return getElement(group)?.children?.[key]
}

function ensureWidget(group: Group): { config: GoalArcElementConfig; bgRing: any; mainRing: any } | null {
  const existingConfig = getConfig(group) as GoalArcElementConfig | undefined
  const existingBg: any = getChild(group, 'bgRing')
  const existingMain: any = getChild(group, 'mainRing')
  if (existingConfig && existingBg && existingMain) {
    installGoalArcRenderer(group)
    return { config: existingConfig, bgRing: existingBg, mainRing: existingMain }
  }

  const objects: any[] = (group as any).getObjects?.() ?? []
  const mainRing: any = objects.find((obj: any) => String(obj?.id ?? '').endsWith('_main'))
  const bgRing: any = objects.find((obj: any) => String(obj?.id ?? '').endsWith('_bg'))
  if (!mainRing || !bgRing) return null

  try {
    const encoded = encodeGoalArc(group as any)
    attachWidget(group, {
      type: 'goalArc',
      config: encoded,
      children: {
        bgRing,
        mainRing,
      },
    })
    installGoalArcRenderer(group)
    return { config: encoded, bgRing, mainRing }
  } catch {
    return null
  }
}

function getProgressAngle(startAngle: number, endAngle: number, counterClockwise: boolean, progress: number) {
  // 规范到 0-359 区间
  startAngle = ((startAngle % 360) + 360) % 360
  endAngle = ((endAngle % 360) + 360) % 360
  const clamped = clampProgress(progress)

  if (counterClockwise) {
    if (endAngle > startAngle) {
      endAngle -= 360
    }
    return startAngle + (endAngle - startAngle) * clamped
  } else {
    if (endAngle < startAngle) {
      endAngle += 360
    }
    return startAngle + (endAngle - startAngle) * clamped
  }
}

function getSignedSweep(startAngle: number, endAngle: number, counterClockwise: boolean) {
  let start = ((startAngle % 360) + 360) % 360
  let end = ((endAngle % 360) + 360) % 360

  if (counterClockwise) {
    if (end > start) end -= 360
  } else {
    if (end < start) end += 360
  }

  return end - start
}

function toRadians(angleDeg: number) {
  return angleDeg * Math.PI / 180
}

function drawArcStroke(
  ctx: CanvasRenderingContext2D,
  radius: number,
  strokeWidth: number,
  stroke: string,
  startAngle: number,
  endAngle: number,
  counterClockwise: boolean,
  endCap: 'round' | 'butt',
) {
  if (radius <= 0 || strokeWidth <= 0) return
  ctx.save()
  ctx.beginPath()
  ctx.strokeStyle = stroke
  ctx.lineWidth = strokeWidth
  ctx.lineCap = endCap
  ctx.arc(0, 0, radius, toRadians(startAngle), toRadians(endAngle), counterClockwise)
  ctx.stroke()
  ctx.restore()
}

function drawRoundCap(
  ctx: CanvasRenderingContext2D,
  radius: number,
  strokeWidth: number,
  color: string,
  angle: number,
) {
  if (radius <= 0 || strokeWidth <= 0) return
  const radians = toRadians(angle)
  ctx.save()
  ctx.beginPath()
  ctx.fillStyle = color
  ctx.arc(Math.cos(radians) * radius, Math.sin(radians) * radius, strokeWidth / 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawGradientSpan(
  ctx: CanvasRenderingContext2D,
  config: GoalArcElementConfig,
  colors: { start: string; end: string },
  spanStartDistance: number,
  spanEndDistance: number,
  totalAngle: number,
  sliceCount: number,
) {
  const spanAngle = spanEndDistance - spanStartDistance
  if (spanAngle <= 0.001 || totalAngle <= 0.001 || sliceCount < 1) return

  const direction = getSignedSweep(config.startAngle, config.endAngle, config.counterClockwise) < 0 ? -1 : 1
  const arcDirection = Boolean(config.counterClockwise)
  const radius = Number(config.radius)
  const strokeWidth = Number(config.strokeWidth)
  const sliceAngle = spanAngle / sliceCount

  for (let index = 0; index < sliceCount; index += 1) {
    const fromDistance = spanStartDistance + sliceAngle * index
    const toDistance = spanStartDistance + sliceAngle * (index + 1)
    const position = ((fromDistance + toDistance) / 2) / totalAngle
    drawArcStroke(
      ctx,
      radius,
      strokeWidth,
      interpolateColor(colors.start, colors.end, position),
      Number(config.startAngle) + direction * fromDistance,
      Number(config.startAngle) + direction * toDistance,
      arcDirection,
      'butt',
    )
  }

  if (normalizeEndCap(config.endCap) === 'round') {
    const startPosition = spanStartDistance / totalAngle
    const endPosition = spanEndDistance / totalAngle
    drawRoundCap(
      ctx,
      radius,
      strokeWidth,
      interpolateColor(colors.start, colors.end, startPosition),
      Number(config.startAngle) + direction * spanStartDistance,
    )
    drawRoundCap(
      ctx,
      radius,
      strokeWidth,
      interpolateColor(colors.start, colors.end, endPosition),
      Number(config.startAngle) + direction * spanEndDistance,
    )
  }
}

function drawContinuousGradientGoalArc(ctx: CanvasRenderingContext2D, config: GoalArcElementConfig) {
  const colors = getGradientColors(config)
  const progress = clampProgress(config.progress ?? 0)
  const totalAngle = Math.abs(getSignedSweep(config.startAngle, config.endAngle, config.counterClockwise))
  const activeAngle = totalAngle * progress
  if (!colors || activeAngle <= 0.001) return

  const sliceCount = Math.min(
    MAX_GRADIENT_ARC_SEGMENTS,
    Math.max(1, Math.ceil(activeAngle / GRADIENT_ARC_STEP_DEGREES)),
  )
  drawGradientSpan(ctx, config, colors, 0, activeAngle, totalAngle, sliceCount)
}

function drawSegmentedGoalArc(ctx: CanvasRenderingContext2D, config: GoalArcElementConfig) {
  const startAngle = Number(config.startAngle)
  const endAngle = Number(config.endAngle)
  const counterClockwise = Boolean(config.counterClockwise)
  const progress = clampProgress(config.progress ?? 0)
  const segments = Math.max(1, Math.floor(Number(config.segments ?? 12)))
  const gapAngle = Math.max(0, Number(config.gapAngle ?? 2))
  const sweep = getSignedSweep(startAngle, endAngle, counterClockwise)
  const direction = sweep < 0 ? -1 : 1
  const totalAngle = Math.abs(sweep)
  const sliceAngle = totalAngle / segments
  const visibleGap = Math.min(gapAngle, Math.max(0, sliceAngle - 0.1))
  const visibleAngle = Math.max(0.1, sliceAngle - visibleGap)
  const activeAngle = totalAngle * progress
  const radius = Number(config.radius)
  const bgRadius = Number(config.bgRadius ?? config.radius)
  const strokeWidth = Number(config.strokeWidth)
  const bgStrokeWidth = Number(config.bgStrokeWidth ?? config.strokeWidth)
  const endCap = normalizeEndCap(config.endCap)
  const gradientColors = getGradientColors(config)
  const activeSpans: Array<{ start: number; end: number }> = []

  for (let index = 0; index < segments; index += 1) {
    const segmentStartDistance = index * sliceAngle + visibleGap / 2
    const segmentEndDistance = segmentStartDistance + visibleAngle
    const segmentStart = startAngle + direction * segmentStartDistance
    const segmentEnd = startAngle + direction * segmentEndDistance

    drawArcStroke(ctx, bgRadius, bgStrokeWidth, config.bgColor, segmentStart, segmentEnd, counterClockwise, endCap)

    const activeEndDistance = Math.min(segmentEndDistance, Math.max(segmentStartDistance, activeAngle))
    const activeVisibleAngle = activeEndDistance - segmentStartDistance
    if (activeVisibleAngle > 0.001) {
      if (gradientColors) {
        activeSpans.push({ start: segmentStartDistance, end: activeEndDistance })
      } else {
        drawArcStroke(
          ctx,
          radius,
          strokeWidth,
          config.color,
          segmentStart,
          segmentStart + direction * activeVisibleAngle,
          counterClockwise,
          endCap,
        )
      }
    }
  }

  if (!gradientColors || activeSpans.length === 0) return

  const desiredSlices = activeSpans.map((span) => Math.max(
    1,
    Math.ceil((span.end - span.start) / GRADIENT_ARC_STEP_DEGREES),
  ))
  const desiredSliceCount = desiredSlices.reduce((sum, count) => sum + count, 0)
  const sliceBudget = Math.max(
    activeSpans.length,
    Math.min(MAX_GRADIENT_ARC_SEGMENTS, desiredSliceCount),
  )
  let usedSlices = 0
  activeSpans.forEach((span, index) => {
    const remainingSpans = activeSpans.length - index
    const remainingBudget = sliceBudget - usedSlices
    const sliceCount = Math.max(1, Math.min(desiredSlices[index], remainingBudget - remainingSpans + 1))
    drawGradientSpan(ctx, config, gradientColors, span.start, span.end, totalAngle, sliceCount)
    usedSlices += sliceCount
  })
}

export function createGoalArc(config: GoalArcElementConfig): FabricElement {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()
  const canvas = canvasStore.canvas
  if (!canvas) {
    throw new Error('Canvas is not initialized')
  }

  const id = ensureGoalElementId(config.id as any)
  const finalConfig: GoalArcElementConfig = {
    ...config,
    id,
    eleType: 'goalArc',
    left: Number(config.left ?? 0),
    top: Number(config.top ?? 0),
    startAngle: Number(config.startAngle ?? 0),
    endAngle: Number(config.endAngle ?? 359),
    radius: Number(config.radius ?? 50),
    bgRadius: Number(config.bgRadius ?? config.radius ?? 50),
    strokeWidth: Number(config.strokeWidth ?? 2),
    bgStrokeWidth: Number(config.bgStrokeWidth ?? config.strokeWidth ?? 2),
    color: config.color ?? '#FFFFFF',
    bgColor: config.bgColor ?? '#555555',
    counterClockwise: Boolean(config.counterClockwise ?? false),
    goalProperty: String(config.goalProperty ?? ''),
    progress: clampProgress(config.progress ?? 0),
    segmentMode: Boolean(config.segmentMode ?? false),
    segments: Math.max(1, Math.floor(Number(config.segments ?? 12))),
    gapAngle: Math.max(0, Number(config.gapAngle ?? 2)),
    endCap: normalizeEndCap(config.endCap),
    gradientEnabled: Boolean(config.gradientEnabled ?? false),
    gradientStartColor: normalizeGradientColor(config.gradientStartColor) ?? normalizeGradientColor(config.color) ?? '#FFFFFF',
    gradientEndColor: normalizeGradientColor(config.gradientEndColor) ?? '#00FFFF',
  }
  debugGoalArc('createGoalArc:finalConfig', { finalConfig })

  const bgRing: any = new Circle({
    fill: 'transparent',
    id: id + '_bg',
    originX: 'center',
    originY: 'center',
    counterClockwise: false,
  })

  const mainRing: any = new Circle({
    fill: 'transparent',
    id: id + '_main',
    originX: 'center',
    originY: 'center',
    counterClockwise: finalConfig.counterClockwise,
  })

  const group: any = new Group([bgRing, mainRing], {
    id,
    eleType: 'goalArc',
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
    designerControlMode: 'default',
    lockScalingX: false,
    lockScalingY: false,
    originX: 'center',
    originY: 'center',
    left: finalConfig.left,
    top: finalConfig.top,
    goalProperty: finalConfig.goalProperty,
    startAngle: finalConfig.startAngle,
    endAngle: finalConfig.endAngle,
    counterClockwise: finalConfig.counterClockwise,
    progress: finalConfig.progress,
    segmentMode: finalConfig.segmentMode,
    segments: finalConfig.segments,
    gapAngle: finalConfig.gapAngle,
    endCap: finalConfig.endCap,
    gradientEnabled: finalConfig.gradientEnabled,
    gradientStartColor: finalConfig.gradientStartColor,
    gradientEndColor: finalConfig.gradientEndColor,
  } as any)

  installGoalArcRenderer(group)

  attachWidget(group, {
    type: 'goalArc',
    config: finalConfig,
    children: {
      bgRing,
      mainRing,
    },
  })

  layoutGoalArc(group)
  attachScaleHandler(group)

  applyControlsToObject(group)

  group.setCoords()
  canvas.add(group)
  layerStore.addLayer(group as any)
  canvas.renderAll?.()
  canvas.discardActiveObject?.()
  canvas.setActiveObject(group)

  try {
    const encoded = encodeGoalArc(group as FabricElement)
    debugGoalArc('createGoalArc:encoded', {
      encoded,
      snapshot: groupDebugSnapshot(group),
    })
    elementDataStore.upsertElement(encoded as any)
  } catch {
    // ignore
  }

  return group as FabricElement
}

function layoutGoalArc(group: Group) {
  const ensured = ensureWidget(group)
  if (!ensured) return
  const { config, bgRing, mainRing } = ensured
  const beforeSnapshot = groupDebugSnapshot(group)

  const startAngle = Number(config.startAngle)
  const endAngle = Number(config.endAngle)
  const counterClockwise = Boolean(config.counterClockwise)
  const progress = clampProgress(config.progress ?? 0)
  const progressAngle = getProgressAngle(startAngle, endAngle, counterClockwise, progress)
  const segmentMode = Boolean(config.segmentMode)
  const segments = Math.max(1, Math.floor(Number(config.segments ?? 12)))
  const gapAngle = Math.max(0, Number(config.gapAngle ?? 2))
  const endCap = normalizeEndCap(config.endCap)
  const gradientEnabled = Boolean(getGradientColors(config))

  debugGoalArc('layout:start', {
    config,
    derived: {
      startAngle,
      endAngle,
      counterClockwise,
      progress,
      progressAngle,
      segmentMode,
      segments,
      gapAngle,
      endCap,
    },
    snapshot: beforeSnapshot,
  })

  if (segmentMode) {
    bgRing.set({
      visible: true,
      opacity: 0,
      left: 0,
      top: 0,
      radius: Number(config.bgRadius ?? config.radius),
      strokeWidth: Number(config.bgStrokeWidth ?? config.strokeWidth),
      stroke: config.bgColor,
      startAngle: 0,
      endAngle: 359,
      counterClockwise: false,
      strokeLineCap: endCap,
    })
    mainRing.set({
      visible: true,
      opacity: 0,
      left: 0,
      top: 0,
      radius: Number(config.radius),
      strokeWidth: Number(config.strokeWidth),
      stroke: config.color,
      startAngle: 0,
      endAngle: 359,
      counterClockwise: false,
      strokeLineCap: endCap,
    })

    debugGoalArc('layout:segment metrics', {
      sweep: getSignedSweep(startAngle, endAngle, counterClockwise),
      segments,
      gapAngle,
    })
  } else {
    bgRing.set({ visible: true, opacity: 1, left: 0, top: 0 })
    mainRing.set({ visible: true, opacity: gradientEnabled ? 0 : 1, left: 0, top: 0 })

    bgRing.set({
      radius: Number(config.bgRadius ?? config.radius),
      strokeWidth: Number(config.bgStrokeWidth ?? config.strokeWidth),
      stroke: config.bgColor,
      startAngle,
      endAngle,
      counterClockwise,
      strokeLineCap: endCap,
    })

    mainRing.set({
      radius: Number(config.radius),
      strokeWidth: Number(config.strokeWidth),
      stroke: config.color,
      startAngle,
      endAngle: progressAngle,
      counterClockwise,
      strokeLineCap: endCap,
    })
  }

  group.set({
    left: config.left,
    top: config.top,
    startAngle,
    endAngle,
    counterClockwise,
    goalProperty: config.goalProperty,
    progress,
    segmentMode,
    segments,
    gapAngle,
    endCap,
    gradientEnabled: Boolean(config.gradientEnabled),
    gradientStartColor: config.gradientStartColor,
    gradientEndColor: config.gradientEndColor,
  } as any)

  refreshGroup(group)
  group.set({
    left: config.left,
    top: config.top,
  } as any)
  group.setCoords()
  debugGoalArc('layout:end', {
    configLeftTop: { left: config.left, top: config.top },
    before: beforeSnapshot,
    after: groupDebugSnapshot(group),
  })
}

function needsSegmentGeometryLayout(patch: Partial<GoalArcElementConfig>) {
  return [
    'left',
    'top',
    'radius',
    'bgRadius',
    'strokeWidth',
    'bgStrokeWidth',
    'segmentMode',
  ].some((key) => Object.prototype.hasOwnProperty.call(patch, key))
}

function isGoalBindingOnlyUpdate(patch: Partial<GoalArcElementConfig>) {
  const keys = Object.keys(patch)
  return keys.length > 0 && keys.every((key) => key === 'goalProperty')
}

export function updateGoalArc(element: FabricElement, patch: Partial<GoalArcElementConfig> = {}): void {
  const group = element as unknown as Group
  const canvas = useCanvasStore().canvas
  const elementDataStore = useElementDataStore()
  const livePositionBefore = {
    left: (group as any).left,
    top: (group as any).top,
  }
  const updatesLeft = Object.prototype.hasOwnProperty.call(patch, 'left')
  const updatesTop = Object.prototype.hasOwnProperty.call(patch, 'top')

  const ensured = ensureWidget(group)
  const currentConfig = ensured?.config
  if (!currentConfig) return
  const beforeSnapshot = groupDebugSnapshot(group)
  debugGoalArc('update:start', {
    patch,
    currentConfig,
    snapshot: beforeSnapshot,
  })

  const nextConfig: GoalArcElementConfig = {
    ...currentConfig,
    ...patch,
    id: currentConfig.id,
    eleType: 'goalArc',
    // 设置项更新会触发 Fabric group bounds 重算，不能把内部重算后的 group 坐标反写成业务坐标。
    // 只有拖拽/显式位置更新传入 left/top 时，才更新配置里的位置。
    left: Number(patch.left ?? currentConfig.left ?? (group as any).left ?? 0),
    top: Number(patch.top ?? currentConfig.top ?? (group as any).top ?? 0),
    progress: clampProgress(patch.progress ?? currentConfig.progress ?? 0),
    segmentMode: Boolean(patch.segmentMode ?? currentConfig.segmentMode ?? false),
    segments: Math.max(1, Math.floor(Number(patch.segments ?? currentConfig.segments ?? 12))),
    gapAngle: Math.max(0, Number(patch.gapAngle ?? currentConfig.gapAngle ?? 2)),
    endCap: normalizeEndCap(patch.endCap ?? currentConfig.endCap),
    gradientEnabled: Boolean(patch.gradientEnabled ?? currentConfig.gradientEnabled ?? false),
    gradientStartColor: normalizeGradientColor(patch.gradientStartColor ?? currentConfig.gradientStartColor)
      ?? normalizeGradientColor(patch.color ?? currentConfig.color)
      ?? '#FFFFFF',
    gradientEndColor: normalizeGradientColor(patch.gradientEndColor ?? currentConfig.gradientEndColor) ?? '#00FFFF',
  }

  const elementMeta = getElement(group)
  if (elementMeta) {
    elementMeta.config = nextConfig
  }
  ;(group as any).dirty = true
  debugGoalArc('update:nextConfig', {
    nextConfig,
    snapshotBeforeLayout: groupDebugSnapshot(group),
  })

  const paintOnlyUpdate = isGoalBindingOnlyUpdate(patch)
    || (
      Boolean(currentConfig.segmentMode)
      && Boolean(nextConfig.segmentMode)
      && !needsSegmentGeometryLayout(patch)
    )

  if (paintOnlyUpdate) {
    group.set({
      startAngle: nextConfig.startAngle,
      endAngle: nextConfig.endAngle,
      counterClockwise: nextConfig.counterClockwise,
      goalProperty: nextConfig.goalProperty,
      progress: nextConfig.progress,
      segmentMode: nextConfig.segmentMode,
      segments: nextConfig.segments,
      gapAngle: nextConfig.gapAngle,
      endCap: nextConfig.endCap,
      gradientEnabled: nextConfig.gradientEnabled,
      gradientStartColor: nextConfig.gradientStartColor,
      gradientEndColor: nextConfig.gradientEndColor,
    } as any)
    debugGoalArc('update:paintOnly', {
      patch,
      before: beforeSnapshot,
      after: groupDebugSnapshot(group),
    })
  } else {
    layoutGoalArc(group)
    const preservedPosition: Record<string, unknown> = {}
    if (!updatesLeft) preservedPosition.left = livePositionBefore.left
    if (!updatesTop) preservedPosition.top = livePositionBefore.top
    if (Object.keys(preservedPosition).length > 0) {
      // ActiveSelection 中 left/top 是相对坐标。设置项可以重算内部几何，
      // 但只有显式位置 patch（拖动/缩放提交）才允许改变外部位置。
      group.set(preservedPosition as any)
      group.setCoords()
    }
  }

  canvas?.requestRenderAll?.()

  try {
    const encoded = encodeGoalArc(group as any)
    const persisted = {
      ...encoded,
      // ActiveSelection 会临时把组内对象的 left/top 变成相对坐标。
      // 只有显式位置 patch（拖动/缩放提交）才允许改变业务坐标。
      left: nextConfig.left,
      top: nextConfig.top,
    }
    debugGoalArc('update:encoded', {
      encoded: persisted,
      before: beforeSnapshot,
      after: groupDebugSnapshot(group),
    })
    elementDataStore.patchElement(String((group as any).id), persisted as any)
  } catch {
    // ignore
  }
}

function attachScaleHandler(group: Group) {
  let committing = false

  group.on('modified', () => {
    if (committing) return

    const sx = Number((group as any).scaleX ?? 1)
    const sy = Number((group as any).scaleY ?? 1)
    const left = Number((group as any).left ?? 0)
    const top = Number((group as any).top ?? 0)
    debugGoalArc('modified', {
      sx,
      sy,
      snapshot: groupDebugSnapshot(group),
    })
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) return

    const s = Math.max(0.0001, Math.max(Math.abs(sx), Math.abs(sy)))
    if (Math.abs(s - 1) < 0.001) {
      const ensured = ensureWidget(group)
      const elementMeta = getElement(group)
      if (ensured?.config && elementMeta) {
        const nextConfig = {
          ...ensured.config,
          left: Math.round(left),
          top: Math.round(top),
        }
        elementMeta.config = nextConfig
        ;(group as any).left = nextConfig.left
        ;(group as any).top = nextConfig.top
        useElementDataStore().patchElement(String((group as any).id), nextConfig as any)
      }
      return
    }

    committing = true
    try {
      const ensured = ensureWidget(group)
      const config = ensured?.config
      if (!config) return

      const nextRadius = Math.max(1, Number(config.radius) * s)
      const nextBgRadius = Math.max(1, Number(config.bgRadius ?? config.radius) * s)
      const nextStrokeWidth = Math.max(0, Number(config.strokeWidth) * s)
      const nextBgStrokeWidth = Math.max(0, Number(config.bgStrokeWidth ?? config.strokeWidth) * s)

      group.set({ scaleX: 1, scaleY: 1 } as any)

      updateGoalArc(group as any, {
        left: Math.round(left),
        top: Math.round(top),
        radius: Math.round(nextRadius),
        bgRadius: Math.round(nextBgRadius),
        strokeWidth: Math.round(nextStrokeWidth),
        bgStrokeWidth: Math.round(nextBgStrokeWidth),
      })
    } finally {
      committing = false
    }
  })
}

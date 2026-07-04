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
    if (forClipping || !config || !config.segmentMode) return
    drawSegmentedGoalArc(ctx, config)
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

  for (let index = 0; index < segments; index += 1) {
    const segmentStartDistance = index * sliceAngle + visibleGap / 2
    const segmentEndDistance = segmentStartDistance + visibleAngle
    const segmentStart = startAngle + direction * segmentStartDistance
    const segmentEnd = startAngle + direction * segmentEndDistance

    drawArcStroke(ctx, bgRadius, bgStrokeWidth, config.bgColor, segmentStart, segmentEnd, counterClockwise, endCap)

    const activeEndDistance = Math.min(segmentEndDistance, Math.max(segmentStartDistance, activeAngle))
    const activeVisibleAngle = activeEndDistance - segmentStartDistance
    if (activeVisibleAngle > 0.001) {
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
    mainRing.set({ visible: true, opacity: 1, left: 0, top: 0 })

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

export function updateGoalArc(element: FabricElement, patch: Partial<GoalArcElementConfig> = {}): void {
  const group = element as unknown as Group
  const canvas = useCanvasStore().canvas
  const elementDataStore = useElementDataStore()

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

  const segmentPaintOnlyUpdate = Boolean(currentConfig.segmentMode)
    && Boolean(nextConfig.segmentMode)
    && !needsSegmentGeometryLayout(patch)

  if (segmentPaintOnlyUpdate) {
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
    } as any)
    debugGoalArc('update:paintOnly', {
      patch,
      before: beforeSnapshot,
      after: groupDebugSnapshot(group),
    })
  } else {
    layoutGoalArc(group)
  }

  canvas?.requestRenderAll?.()

  try {
    const encoded = encodeGoalArc(group as any)
    debugGoalArc('update:encoded', {
      encoded,
      before: beforeSnapshot,
      after: groupDebugSnapshot(group),
    })
    elementDataStore.patchElement(String((group as any).id), encoded as any)
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

import { Rect, Group, Polygon } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { GoalBarElementConfig } from '@/types/elements/goal'
import type { MinimalFabricLike } from '@/types/layer'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { encodeGoalBar } from './goalBar.encoder'
import { applyControlsToObject } from '@/utils/controlManager'
import { clampProgress } from '@/elements/goal/goal.common'
import {
  denormalizePolygonPoints,
  isConvexPolygon,
  clipGoalBarPolygon,
  normalizeGoalBarPolygonConfig,
  validateGoalBarPolygon,
  type GoalBarPolygonPoint,
} from './goalBar.geometry'
import { createGoalBarGradientFill } from './goalBar.gradient'
import {
  getGoalBarProgressBounds,
  normalizeGoalBarDirection,
  resolveGoalBarDirection,
  resolveGoalBarOrientation,
  type GoalBarProgressDirection,
} from './goalBar.direction'

type GoalBarVariant = NonNullable<GoalBarElementConfig['variant']>
type GoalBarRuntimeConfig = Omit<GoalBarElementConfig, 'eleType'> & {
  eleType: 'goalBar'
  variant: GoalBarVariant
  segments: number
  gap: number
  shape: NonNullable<GoalBarElementConfig['shape']>
  polygonPoints: GoalBarPolygonPoint[]
}

/**
 * ===============================
 * 工具方法
 * ===============================
 */

/**
 * ✅ v6 标准：刷新 group 布局
 */
function refreshGroup(group: Group) {
  ;(group as any)._onAfterObjectsChange?.()
  group.setCoords()
}

/**
 * ✅ Widget 工具：在 group 上挂载统一的 element 元数据
 */
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

function setChildren(group: Group, children: Record<string, any>) {
  const elementMeta = getElement(group)
  if (elementMeta) {
    elementMeta.children = children
  }
}

function removeGroupChildren(group: Group) {
  const children = group.getObjects?.() ?? []
  children.forEach((child: any) => {
    if (typeof (group as any).removeWithUpdate === 'function') {
      ;(group as any).removeWithUpdate(child)
    } else if (typeof group.remove === 'function') {
      group.remove(child)
    }
  })
}

function addGroupChild(group: Group, child: any) {
  if (typeof (group as any).addWithUpdate === 'function') {
    ;(group as any).addWithUpdate(child)
  } else if (typeof group.add === 'function') {
    group.add(child)
  }
}

function createBoundsAnchor(group: Group, width: number, height: number, borderWidth: number) {
  const anchor = new Rect({
    id: `${(group as any).id}_bounds_anchor`,
    left: 0,
    top: 0,
    width: width + Math.max(0, borderWidth),
    height: height + Math.max(0, borderWidth),
    fill: 'rgba(0,0,0,0)',
    strokeWidth: 0,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
  }) as unknown as Rect
  return anchor
}

function createPolygonObject(
  id: string,
  points: GoalBarPolygonPoint[],
  fill: any,
  stroke?: string,
  strokeWidth = 0,
) {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const left = (Math.min(...xs) + Math.max(...xs)) / 2
  const top = (Math.min(...ys) + Math.max(...ys)) / 2

  return new Polygon(points, {
    id,
    left,
    top,
    fill,
    stroke,
    strokeWidth,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
    objectCaching: false,
  } as any)
}

function createPolygonProgressObject(
  id: string,
  points: GoalBarPolygonPoint[],
  fill: any,
  width: number,
  height: number,
  progress: number,
  direction: GoalBarProgressDirection,
) {
  const polygon = createPolygonObject(id, points, fill)
  const bounds = getGoalBarProgressBounds(width, height, progress, direction)
  ;(polygon as any).clipPath = new Rect({
    left: -width / 2 + bounds.left + bounds.width / 2,
    top: -height / 2 + bounds.top + bounds.height / 2,
    width: bounds.width,
    height: bounds.height,
    originX: 'center',
    originY: 'center',
    fill: '#000000',
    selectable: false,
    evented: false,
  })
  return polygon
}

function normalizeGoalBarConfig(
  config: Partial<GoalBarElementConfig>,
  id: string,
): GoalBarRuntimeConfig {
  const polygon = normalizeGoalBarPolygonConfig({
    shape: (config as any).shape,
    polygonPoints: (config as any).polygonPoints,
    slantRatio: (config as any).slantRatio,
  })
  const progressDirection = normalizeGoalBarDirection(
    (config as any).progressDirection,
    (config as any).progressAlign,
  )

  return {
    id,
    eleType: 'goalBar',
    left: Number(config.left ?? 0),
    top: Number(config.top ?? 0),
    width: Number(config.width ?? 200),
    height: Number(config.height ?? 10),
    padding: Number((config as Partial<GoalBarElementConfig>).padding ?? 0),
    progress: clampProgress(config.progress ?? 0),
    orientation: resolveGoalBarOrientation(progressDirection),
    progressDirection,
    variant: ((config as Partial<GoalBarElementConfig>).variant ?? 'continuous') as GoalBarVariant,
    segments: Math.max(1, Math.floor(Number((config as any).segments ?? 10))),
    gap: Math.max(0, Number((config as any).gap ?? 2)),
    shape: polygon.shape,
    polygonPoints: polygon.polygonPoints,
    borderRadius: Math.max(0, Number(config.borderRadius ?? 5)),
    color: config.color ?? '#00FF00',
    bgColor: config.bgColor ?? '#333333',
    borderWidth: Math.max(0, Number(config.borderWidth ?? 0)),
    borderColor: config.borderColor ?? '#FFFFFF',
    originX: 'center' as any,
    originY: 'center' as any,
    goalProperty: config.goalProperty ?? '',
    gradientEnabled: polygon.shape === 'customPolygon' && !isConvexPolygon(polygon.polygonPoints)
      ? false
      : Boolean(config.gradientEnabled ?? false),
    gradientStartColor: config.gradientStartColor ?? config.color ?? '#00FF00',
    gradientEndColor: config.gradientEndColor ?? config.color ?? '#00FF00',
  }
}

function syncGoalBarPosition(group: Group) {
  const elementMeta = getElement(group)
  const currentConfig = elementMeta?.config
  const id = (group as any).id
  if (!currentConfig || id == null) return

  const left = Math.round(Number((group as any).left ?? currentConfig.left ?? 0))
  const top = Math.round(Number((group as any).top ?? currentConfig.top ?? 0))
  const nextConfig = {
    ...currentConfig,
    left,
    top,
  }

  elementMeta.config = nextConfig
  useElementDataStore().patchElement(String(id), nextConfig as any)
}

/**
 * ===============================
 * layout：集中布局逻辑
 * ===============================
 */
type GoalBarLayoutOptions = {
  configOverride?: Partial<GoalBarElementConfig>
  syncRuntimeMetadata?: boolean
}

const GOAL_BAR_ENCODER_LIVE_FIELDS = [
  'left', 'top', 'shape', 'polygonPoints', 'slantRatio', 'color', 'bgColor',
  'variant', 'segments', 'gap', 'borderRadius', 'progress', 'padding',
  'borderWidth', 'borderColor', 'goalProperty', 'orientation', 'progressDirection',
  'gradientEnabled', 'gradientStartColor', 'gradientEndColor',
] as const

function snapshotGoalBarEncoderLiveFields(group: Group): Record<string, unknown> {
  return Object.fromEntries(
    GOAL_BAR_ENCODER_LIVE_FIELDS.map((field) => [field, (group as any)[field]]),
  )
}

function isGoalBarGroup(element: FabricElement): element is FabricElement & Group {
  if (!(element instanceof Group)) return false
  const group = element as unknown as Group
  return (group as any).eleType === 'goalBar' && getConfig(group)?.eleType === 'goalBar'
}

function layoutGoalBar(group: Group, options: GoalBarLayoutOptions = {}) {
  const persistentConfig = getConfig(group)

  if (!persistentConfig) return

  const config = normalizeGoalBarConfig(
    { ...persistentConfig, ...options.configOverride },
    String(persistentConfig.id ?? (group as any).id),
  )
  const syncRuntimeMetadata = options.syncRuntimeMetadata ?? true
  const previewRuntimeSnapshot = syncRuntimeMetadata
    ? undefined
    : snapshotGoalBarEncoderLiveFields(group)

  const {
    width,
    height,
    padding,
    progress: progressValue,
    progressDirection,
    borderRadius,
    color,
    bgColor,
    borderWidth,
    borderColor,
    variant,
    segments,
    gap,
    shape,
    polygonPoints,
    gradientEnabled,
    gradientStartColor,
    gradientEndColor,
  } = config
  const directionModel = resolveGoalBarDirection(progressDirection)
  const stableLeft = Number(config.left ?? (group as any).left ?? 0)
  const stableTop = Number(config.top ?? (group as any).top ?? 0)
  const restoreGroupPosition = () => {
    if (previewRuntimeSnapshot) {
      group.set(previewRuntimeSnapshot as any)
      group.setCoords()
      return
    }
    const runtimeMetadata = syncRuntimeMetadata ? {
      goalProperty: config.goalProperty,
      progress: progressValue,
      variant,
      segments,
      gap,
      shape,
      polygonPoints: polygonPoints.map((point) => ({ ...point })),
      progressDirection,
      gradientEnabled,
      gradientStartColor,
      gradientEndColor,
    } : {}
    group.set({
      left: stableLeft,
      top: stableTop,
      ...runtimeMetadata,
    } as any)
    group.setCoords()
  }

  if (variant === 'segmented') {
    removeGroupChildren(group)

    const segmentCount = Math.max(1, Math.floor(Number(segments ?? 10)))
    const segmentGap = Math.max(0, Number(gap ?? 2))
    const mainLength = directionModel.axis === 'horizontal' ? width : height
    const contentLength = Math.max(0, mainLength - segmentGap * (segmentCount - 1))
    const segmentLength = segmentCount > 0 ? contentLength / segmentCount : 0
    const activeTotal = clampProgress(progressValue ?? 0) * segmentCount
    const fullActive = Math.floor(activeTotal)
    const remainder = activeTotal - fullActive
    const nextChildren: Record<string, any> = {}
    const boundsAnchor = createBoundsAnchor(group, width, height, borderWidth)
    nextChildren.boundsAnchor = boundsAnchor
    addGroupChild(group, boundsAnchor)

    for (let i = 0; i < segmentCount; i++) {
      const mainCenter = -mainLength / 2 + i * (segmentLength + segmentGap) + segmentLength / 2
      const segmentWidth = directionModel.axis === 'horizontal' ? segmentLength : width
      const segmentHeight = directionModel.axis === 'horizontal' ? height : segmentLength
      const x = directionModel.axis === 'horizontal' ? mainCenter : 0
      const y = directionModel.axis === 'horizontal' ? 0 : mainCenter
      const segmentLeft = x - segmentWidth / 2
      const segmentTop = y - segmentHeight / 2
      const radius = Math.min(borderRadius, segmentWidth / 2, segmentHeight / 2)
      const segmentPolygonPoints = shape === 'rectangle'
        ? []
        : denormalizePolygonPoints(polygonPoints, {
            left: segmentLeft,
            top: segmentTop,
            width: segmentWidth,
            height: segmentHeight,
          })

      const backgroundObject = shape === 'rectangle'
        ? new Rect({
            id: `${(group as any).id}_${i}_seg_bg`,
            left: x,
            top: y,
            width: segmentWidth,
            height: segmentHeight,
            fill: bgColor,
            rx: radius,
            ry: radius,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
          })
        : createPolygonObject(`${(group as any).id}_${i}_seg_bg`, segmentPolygonPoints, bgColor)
      nextChildren[`segmentBg${i}`] = backgroundObject
      addGroupChild(group, backgroundObject)

      const progressIndex = directionModel.reversed ? segmentCount - 1 - i : i
      const segmentProgress = progressIndex < fullActive
        ? 1
        : progressIndex === fullActive
          ? remainder
          : 0
      if (segmentProgress > 0) {
        const activeBounds = getGoalBarProgressBounds(segmentWidth, segmentHeight, segmentProgress, progressDirection)
        const gradientFill = createGoalBarGradientFill({
          enabled: Boolean(gradientEnabled),
          startColor: gradientStartColor,
          endColor: gradientEndColor,
          progressDirection,
          width: activeBounds.width,
          height: activeBounds.height,
          startRatio: activeTotal > 0 ? progressIndex / activeTotal : 0,
          endRatio: activeTotal > 0 ? (progressIndex + segmentProgress) / activeTotal : 1,
        })
        const activeFill = gradientFill ?? color
        let activeObject: Rect | Polygon | undefined
        if (shape === 'rectangle') {
          const activeLeft = segmentLeft + activeBounds.left + activeBounds.width / 2
          const activeTop = segmentTop + activeBounds.top + activeBounds.height / 2
          const activeRadius = Math.min(radius, activeBounds.width / 2, activeBounds.height / 2)
          activeObject = new Rect({
            id: `${(group as any).id}_${i}_seg_active`,
            left: activeLeft,
            top: activeTop,
            width: activeBounds.width,
            height: activeBounds.height,
            fill: activeFill,
            rx: activeRadius,
            ry: activeRadius,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
          })
        } else {
          if (isConvexPolygon(polygonPoints)) {
            const activePoints = denormalizePolygonPoints(
              clipGoalBarPolygon(polygonPoints, segmentProgress, progressDirection),
              { left: segmentLeft, top: segmentTop, width: segmentWidth, height: segmentHeight },
            )
            if (activePoints.length >= 3) {
              activeObject = createPolygonObject(`${(group as any).id}_${i}_seg_active`, activePoints, activeFill)
            }
          } else {
            activeObject = createPolygonProgressObject(
              `${(group as any).id}_${i}_seg_active`,
              segmentPolygonPoints,
              color,
              segmentWidth,
              segmentHeight,
              segmentProgress,
              progressDirection,
            )
          }
        }
        if (activeObject) {
          nextChildren[`segmentActive${i}`] = activeObject
          addGroupChild(group, activeObject)
        }
      }

      if (borderWidth > 0) {
        const borderObject = shape === 'rectangle'
          ? new Rect({
              id: `${(group as any).id}_${i}_seg_border`,
              left: x,
              top: y,
              width: segmentWidth,
              height: segmentHeight,
              fill: 'transparent',
              stroke: borderColor,
              strokeWidth: borderWidth,
              rx: radius,
              ry: radius,
              originX: 'center',
              originY: 'center',
              selectable: false,
              evented: false,
            })
          : createPolygonObject(
              `${(group as any).id}_${i}_seg_border`,
              segmentPolygonPoints,
              'transparent',
              borderColor,
              borderWidth,
            )
        nextChildren[`segmentBorder${i}`] = borderObject
        addGroupChild(group, borderObject)
      }
    }

    ;(group as any).designWidth = width
    ;(group as any).designHeight = height
    ;(group as any).width = width
    ;(group as any).height = height
    setChildren(group, nextChildren)
    refreshGroup(group)
    restoreGroupPosition()
    return
  }

  if (shape !== 'rectangle') {
    removeGroupChildren(group)
    const nextChildren: Record<string, any> = {}
    const boundsAnchor = createBoundsAnchor(group, width, height, borderWidth)
    const absolutePolygonPoints = denormalizePolygonPoints(polygonPoints, {
      left: -width / 2,
      top: -height / 2,
      width,
      height,
    })
    const background = createPolygonObject(
      `${(group as any).id}_background`,
      absolutePolygonPoints,
      bgColor,
    )
    nextChildren.boundsAnchor = boundsAnchor
    nextChildren.background = background
    addGroupChild(group, boundsAnchor)
    addGroupChild(group, background)

    if (progressValue > 0) {
      const polygonConvex = isConvexPolygon(polygonPoints)
      const activePoints = polygonConvex
        ? denormalizePolygonPoints(
            clipGoalBarPolygon(polygonPoints, progressValue, progressDirection),
            { left: -width / 2, top: -height / 2, width, height },
          )
        : []
      const progress = polygonConvex
        ? createPolygonObject(
            `${(group as any).id}_progress`,
            activePoints,
            createGoalBarGradientFill({
              enabled: Boolean(gradientEnabled),
              startColor: gradientStartColor,
              endColor: gradientEndColor,
              progressDirection,
              width,
              height,
            }) ?? color,
          )
        : createPolygonProgressObject(
            `${(group as any).id}_progress`,
            absolutePolygonPoints,
            color,
            width,
            height,
            progressValue,
            progressDirection,
          )
      nextChildren.progress = progress
      addGroupChild(group, progress)
    }

    if (borderWidth > 0) {
      const border = createPolygonObject(
        `${(group as any).id}_border`,
        absolutePolygonPoints,
        'transparent',
        borderColor,
        borderWidth,
      )
      nextChildren.border = border
      addGroupChild(group, border)
    }

    ;(group as any).designWidth = width
    ;(group as any).designHeight = height
    ;(group as any).width = width
    ;(group as any).height = height
    setChildren(group, nextChildren)
    refreshGroup(group)
    restoreGroupPosition()
    return
  }

  let background = getChild(group, 'background') as Rect | undefined
  let progress = getChild(group, 'progress') as Rect | undefined
  let boundsAnchor = getChild(group, 'boundsAnchor') as Rect | undefined
  if (!(background instanceof Rect) || !(progress instanceof Rect) || !(boundsAnchor instanceof Rect)) {
    removeGroupChildren(group)
    boundsAnchor = createBoundsAnchor(group, width, height, borderWidth)
    background = new Rect({
      id: `${(group as any).id}_background`,
      left: 0,
      top: 0,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    })
    progress = new Rect({
      id: `${(group as any).id}_progress`,
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'center',
      strokeWidth: 0,
      selectable: false,
      evented: false,
    })
    addGroupChild(group, boundsAnchor)
    addGroupChild(group, background)
    addGroupChild(group, progress)
    setChildren(group, { boundsAnchor, background, progress })
  }

  boundsAnchor.set({
    width: width + Math.max(0, borderWidth),
    height: height + Math.max(0, borderWidth),
    left: 0,
    top: 0,
  })

  background.set({
    width,
    height,
    rx: borderRadius,
    ry: borderRadius,
    fill: bgColor,
    stroke: borderColor,
    strokeWidth: borderWidth ?? 0,
  })

  const contentWidth = Math.max(0, width - padding * 2)
  const contentHeight = Math.max(0, height - padding * 2)
  const progressBounds = getGoalBarProgressBounds(contentWidth, contentHeight, progressValue, progressDirection)
  progress.set({
    left: -width / 2 + padding + progressBounds.left,
    top: -height / 2 + padding + progressBounds.top,
    originX: 'left',
    originY: 'top',
    width: progressBounds.width,
    height: progressBounds.height,
    rx: Math.max(0, borderRadius - padding),
    ry: Math.max(0, borderRadius - padding),
    fill: createGoalBarGradientFill({
      enabled: Boolean(gradientEnabled),
      startColor: gradientStartColor,
      endColor: gradientEndColor,
      progressDirection,
      width: progressBounds.width,
      height: progressBounds.height,
    }) ?? color,
  })

  refreshGroup(group)
  restoreGroupPosition()
}

/**
 * Rebuilds a goal bar with temporary polygon geometry without touching its
 * persistent config or the live metadata preferred by encodeGoalBar.
 */
export function previewGoalBarPolygon(
  element: FabricElement,
  polygonPoints: GoalBarPolygonPoint[],
): boolean {
  if (!isGoalBarGroup(element)) return false
  const group = element as unknown as Group

  const points = Array.isArray(polygonPoints)
    ? polygonPoints.map((point) => ({ x: Number(point?.x), y: Number(point?.y) }))
    : []
  if (!validateGoalBarPolygon(points).valid) return false

  const originalObjects = [...(group.getObjects?.() ?? [])]
  const elementMeta = getElement(group)
  const originalChildren = elementMeta?.children
  const originalLiveFields = snapshotGoalBarEncoderLiveFields(group)

  try {
    layoutGoalBar(group, {
      configOverride: { shape: 'customPolygon', polygonPoints: points },
      syncRuntimeMetadata: false,
    })
  } catch {
    try {
      removeGroupChildren(group)
      originalObjects.forEach((child) => addGroupChild(group, child))
    } catch {
      // Best effort continues below: metadata and encoder-visible fields must
      // still be restored even if Fabric itself rejects an object operation.
    }
    if (elementMeta) elementMeta.children = originalChildren
    try {
      group.set(originalLiveFields as any)
    } catch {
      Object.assign(group as any, originalLiveFields)
    }
    return false
  }
  useCanvasStore().canvas?.requestRenderAll()
  return true
}

/** Restores previewed visuals and runtime metadata from persistent config. */
export function restoreGoalBarPreview(element: FabricElement): void {
  if (!isGoalBarGroup(element)) return
  const group = element as unknown as Group

  layoutGoalBar(group, { syncRuntimeMetadata: true })
  useCanvasStore().canvas?.requestRenderAll()
}

/**
 * ===============================
 * 创建
 * ===============================
 */
export async function createGoalBar(
  config: GoalBarElementConfig,
): Promise<FabricElement> {
  const canvas = useCanvasStore().canvas
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()

  if (!canvas) throw new Error('Canvas not initialized')

  const id = String(config.id ?? nanoid())
  const finalConfig = normalizeGoalBarConfig(config, id)

  /**
   * background（以 group 中心为坐标系）
   */
  const background = new Rect({
    id: `${id}_background`,
    left: 0,
    top: 0,
    originX: 'center',
    originY: 'center',
    strokeWidth: finalConfig.borderWidth ?? 0,
    stroke: finalConfig.borderColor,
  })

  /**
   * progress
   */
  const progress = new Rect({
    id: `${id}_progress`,
    left: 0,
    top: 0,
    originX: 'left',
    originY: 'center',
    strokeWidth: 0,
  })

  /**
   * group（注意：子元素全部用局部坐标）
   */
  const group = new Group([background, progress], {
    id,
    left: finalConfig.left,
    top: finalConfig.top,
    originX: finalConfig.originX,
    originY: finalConfig.originY,

    eleType: 'goalBar',
    designerControlMode: 'resize8',
  } as any)

  /**
   * 🔥 核心：挂 widget 结构
   */
  attachWidget(group, {
    type: 'goalBar',
    config: finalConfig,
    children: {
      background,
      progress,
    },
  })

  ;(group as any).designWidth = finalConfig.width
  ;(group as any).designHeight = finalConfig.height

  /**
   * 🔥 统一 layout
   */
  layoutGoalBar(group)

  attachScaleHandler(group)

  // 应用统一的自定义控制点（缩放 / 旋转 / 克隆 / 删除）
  applyControlsToObject(group)

  canvas.add(group)
  layerStore.addLayer(group as unknown as MinimalFabricLike)
  canvas.setActiveObject(group)
  canvas.requestRenderAll()

  const encoded = encodeGoalBar(group as FabricElement)
  elementDataStore.upsertElement(encoded as any)

  return group as FabricElement
}

/**
 * ===============================
 * 更新（核心）
 * ===============================
 */
export function updateGoalBar(
  element: FabricElement,
  patch: Partial<GoalBarElementConfig> = {},
) {
  const group = element as unknown as Group
  const canvas = useCanvasStore().canvas
  const elementDataStore = useElementDataStore()
  const currentConfig = getConfig(group)
  if (!currentConfig) return

  const {
    slantRatio: legacyCurrentSlantRatio,
    ...currentConfigWithoutLegacySlant
  } = currentConfig as GoalBarRuntimeConfig & { slantRatio?: unknown }
  const {
    slantRatio: legacyPatchSlantRatio,
    ...patchWithoutLegacySlant
  } = patch as Partial<GoalBarElementConfig> & { slantRatio?: unknown }
  const polygon = normalizeGoalBarPolygonConfig({
    shape: patchWithoutLegacySlant.shape ?? currentConfigWithoutLegacySlant.shape,
    polygonPoints: patchWithoutLegacySlant.polygonPoints ?? currentConfigWithoutLegacySlant.polygonPoints,
    slantRatio: legacyPatchSlantRatio ?? legacyCurrentSlantRatio,
  })

  /**
   * === 数据合并到 config ===
   */
  const nextConfig = {
    ...currentConfigWithoutLegacySlant,
    ...patchWithoutLegacySlant,
    // Fabric group bounds can be recalculated during layout. Only explicit left/top patches
    // should override the current canvas position stored in the widget config.
    left: Number(patch.left ?? (group as any).left ?? currentConfig.left ?? 0),
    top: Number(patch.top ?? (group as any).top ?? currentConfig.top ?? 0),
    progress: patch.progress !== undefined ? clampProgress(patch.progress) : currentConfig.progress,
    segments: patch.segments !== undefined ? Math.max(1, Math.floor(Number(patch.segments))) : currentConfig.segments,
    gap: patch.gap !== undefined ? Math.max(0, Number(patch.gap)) : currentConfig.gap,
    shape: polygon.shape,
    polygonPoints: polygon.polygonPoints,
    gradientEnabled: polygon.shape === 'customPolygon' && !isConvexPolygon(polygon.polygonPoints)
      ? false
      : Boolean(patchWithoutLegacySlant.gradientEnabled ?? currentConfigWithoutLegacySlant.gradientEnabled ?? false),
  }

  const elementMeta = getElement(group)
  if (elementMeta) {
    elementMeta.config = nextConfig
  }

  /**
   * 🔥 统一 layout
   */
  layoutGoalBar(group)
  canvas?.requestRenderAll()

  /**
   * 数据同步
   */
  const encoded = encodeGoalBar(group as FabricElement)
  const id = (group as any).id
  if (id != null) {
    elementDataStore.patchElement(String(id), encoded as any)
  }
}

/**
 * ===============================
 * scale → width/height 转换
 * ===============================
 */
function attachScaleHandler(group: Group) {
  let committing = false

  group.on('modified', () => {
    if (committing) return

    const sx = group.scaleX ?? 1
    const sy = group.scaleY ?? 1

    if (Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001) {
      syncGoalBarPosition(group)
      return
    }

    committing = true

    try {
      const config = getConfig(group)
      if (!config) return

      const nextW = Math.max(1, config.width * sx)
      const nextH = Math.max(1, config.height * sy)

      // 清掉 scale
      group.set({ scaleX: 1, scaleY: 1 })

      updateGoalBar(group as any, {
        width: Math.round(nextW),
        height: Math.round(nextH),
      })
    } finally {
      committing = false
    }
  })
}

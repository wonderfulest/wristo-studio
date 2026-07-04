import { Rect, Group } from 'fabric'
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

type GoalBarVariant = NonNullable<GoalBarElementConfig['variant']>
type GoalBarRuntimeConfig = Omit<GoalBarElementConfig, 'eleType'> & {
  eleType: 'goalBar'
  variant: GoalBarVariant
  segments: number
  gap: number
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

/**
 * ✅ 正确的进度条定位（基于 origin=center）
 */
function getProgressLeft(
  background: Rect,
  padding: number,
  align: 'left' | 'right',
  progress: number,
) {
  const leftEdge = -background.width / 2
  const rightEdge = background.width / 2

  if (align === 'right') {
    const progressWidth = (background.width - padding * 2) * progress
    return rightEdge - padding - progressWidth
  }

  return leftEdge + padding
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

function normalizeGoalBarConfig(
  config: Partial<GoalBarElementConfig>,
  id: string,
): GoalBarRuntimeConfig {
  return {
    id,
    eleType: 'goalBar',
    left: Number(config.left ?? 0),
    top: Number(config.top ?? 0),
    width: Number(config.width ?? 200),
    height: Number(config.height ?? 10),
    padding: Number((config as Partial<GoalBarElementConfig>).padding ?? 0),
    progress: clampProgress(config.progress ?? 0),
    progressAlign: ((config as Partial<GoalBarElementConfig>).progressAlign ?? 'left') as 'left' | 'right',
    variant: ((config as Partial<GoalBarElementConfig>).variant ?? 'continuous') as GoalBarVariant,
    segments: Math.max(1, Math.floor(Number((config as any).segments ?? 10))),
    gap: Math.max(0, Number((config as any).gap ?? 2)),
    borderRadius: Math.max(0, Number(config.borderRadius ?? 5)),
    color: config.color ?? '#00FF00',
    bgColor: config.bgColor ?? '#333333',
    borderWidth: Math.max(0, Number(config.borderWidth ?? 0)),
    borderColor: config.borderColor ?? '#FFFFFF',
    originX: 'center' as any,
    originY: 'center' as any,
    goalProperty: config.goalProperty ?? '',
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
function layoutGoalBar(group: Group) {
  const config = getConfig(group)

  if (!config) return

  const {
    width,
    height,
    padding,
    progress: progressValue,
    progressAlign,
    borderRadius,
    color,
    bgColor,
    borderWidth,
    borderColor,
    variant,
    segments,
    gap,
  } = config
  const stableLeft = Number(config.left ?? (group as any).left ?? 0)
  const stableTop = Number(config.top ?? (group as any).top ?? 0)
  const restoreGroupPosition = () => {
    group.set({
      left: stableLeft,
      top: stableTop,
      goalProperty: config.goalProperty,
      progress: progressValue,
      variant,
      segments,
      gap,
    } as any)
    group.setCoords()
  }

  if (variant === 'segmented') {
    removeGroupChildren(group)

    const segmentCount = Math.max(1, Math.floor(Number(segments ?? 10)))
    const segmentGap = Math.max(0, Number(gap ?? 2))
    const contentWidth = Math.max(0, width - segmentGap * (segmentCount - 1))
    const segmentWidth = segmentCount > 0 ? contentWidth / segmentCount : 0
    const activeTotal = clampProgress(progressValue ?? 0) * segmentCount
    const fullActive = Math.floor(activeTotal)
    const remainder = activeTotal - fullActive
    const nextChildren: Record<string, any> = {}
    const boundsAnchor = createBoundsAnchor(group, width, height, borderWidth)
    nextChildren.boundsAnchor = boundsAnchor
    addGroupChild(group, boundsAnchor)

    for (let i = 0; i < segmentCount; i++) {
      const x = -width / 2 + i * (segmentWidth + segmentGap) + segmentWidth / 2
      const radius = Math.min(borderRadius, segmentWidth / 2, height / 2)

      const bgRect = new Rect({
        id: `${(group as any).id}_${i}_seg_bg`,
        left: x,
        top: 0,
        width: segmentWidth,
        height,
        fill: bgColor,
        rx: radius,
        ry: radius,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      }) as unknown as Rect
      nextChildren[`segmentBg${i}`] = bgRect
      addGroupChild(group, bgRect)

      const progressIndex = progressAlign === 'right' ? segmentCount - 1 - i : i
      if (progressIndex < fullActive || (progressIndex === fullActive && remainder > 0)) {
        const activeWidth = progressIndex < fullActive ? segmentWidth : Math.max(0, Math.min(1, remainder)) * segmentWidth
        const activeLeft = progressAlign === 'right'
          ? x + segmentWidth / 2 - activeWidth / 2
          : x - segmentWidth / 2 + activeWidth / 2
        const activeRadius = Math.min(radius, activeWidth / 2, height / 2)
        const activeRect = new Rect({
          id: `${(group as any).id}_${i}_seg_active`,
          left: activeLeft,
          top: 0,
          width: activeWidth,
          height,
          fill: color,
          rx: activeRadius,
          ry: activeRadius,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
        }) as unknown as Rect
        nextChildren[`segmentActive${i}`] = activeRect
        addGroupChild(group, activeRect)
      }

      if (borderWidth > 0) {
        const borderRect = new Rect({
          id: `${(group as any).id}_${i}_seg_border`,
          left: x,
          top: 0,
          width: segmentWidth,
          height,
          fill: 'transparent',
          stroke: borderColor,
          strokeWidth: borderWidth,
          rx: radius,
          ry: radius,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
        }) as unknown as Rect
        nextChildren[`segmentBorder${i}`] = borderRect
        addGroupChild(group, borderRect)
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

  let background = getChild(group, 'background') as Rect | undefined
  let progress = getChild(group, 'progress') as Rect | undefined
  let boundsAnchor = getChild(group, 'boundsAnchor') as Rect | undefined
  if (!background || !progress || !boundsAnchor) {
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

  progress.set({
    left: getProgressLeft(background, padding, progressAlign, progressValue),
    width: (width - padding * 2) * progressValue,
    height: height - padding * 2,
    rx: Math.max(0, borderRadius - padding),
    ry: Math.max(0, borderRadius - padding),
    fill: color,
  })

  refreshGroup(group)
  restoreGroupPosition()
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

  /**
   * === 数据合并到 config ===
   */
  const nextConfig = {
    ...currentConfig,
    ...patch,
    // Fabric group bounds can be recalculated during layout. Only explicit left/top patches
    // should override the current canvas position stored in the widget config.
    left: Number(patch.left ?? (group as any).left ?? currentConfig.left ?? 0),
    top: Number(patch.top ?? (group as any).top ?? currentConfig.top ?? 0),
    progress: patch.progress !== undefined ? clampProgress(patch.progress) : currentConfig.progress,
    segments: patch.segments !== undefined ? Math.max(1, Math.floor(Number(patch.segments))) : currentConfig.segments,
    gap: patch.gap !== undefined ? Math.max(0, Number(patch.gap)) : currentConfig.gap,
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

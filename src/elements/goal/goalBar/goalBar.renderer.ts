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

/**
 * ===============================
 * layout：集中布局逻辑
 * ===============================
 */
function layoutGoalBar(group: Group) {
  const config = getConfig(group)
  const background = getChild(group, 'background') as Rect | undefined
  const progress = getChild(group, 'progress') as Rect | undefined

  if (!config || !background || !progress) return

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
    goalProperty,
  } = config

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

  const id = nanoid()
  const finalConfig = {
    id,
    width: Number(config.width ?? 200),
    height: Number(config.height ?? 10),
    padding: Number(config.padding ?? 2),
    progress: config.progress ?? 0,
    progressAlign: config.progressAlign ?? 'left',
    borderRadius: config.borderRadius ?? 5,
    color: config.color ?? '#00FF00',
    bgColor: config.bgColor ?? '#333',
    borderWidth: config.borderWidth,
    borderColor: config.borderColor,
    goalProperty: config.goalProperty,
  }

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
    left: config.left || 0,
    top: config.top || 0,
    originX: 'center',
    originY: 'center',

    // 仍然保留 eleType 以兼容 layerStore
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
  elementDataStore.patchElement(group.id as string, encoded as any)
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

    if (Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001) return

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
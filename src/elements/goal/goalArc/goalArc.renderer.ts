import { Circle, Group } from 'fabric'
import type { FabricElement } from '@/types/element'
import type { GoalArcElementConfig } from '@/types/elements/goal'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { ensureGoalElementId, clampProgress } from '@/elements/goal/goal.common'
import { encodeGoalArc } from '@/elements/goal/goalArc/goalArc.encoder'
import { applyControlsToObject } from '@/utils/controlManager'

function refreshGroup(group: Group) {
  ;(group as any)._onAfterObjectsChange?.()
  group.setCoords()
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
  }

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
    designerControlMode: 'resize8',
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
  } as any)

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

  const startAngle = Number(config.startAngle)
  const endAngle = Number(config.endAngle)
  const counterClockwise = Boolean(config.counterClockwise)
  const progress = clampProgress(config.progress ?? 0)
  const progressAngle = getProgressAngle(startAngle, endAngle, counterClockwise, progress)

  bgRing.set({
    radius: Number(config.bgRadius ?? config.radius),
    strokeWidth: Number(config.bgStrokeWidth ?? config.strokeWidth),
    stroke: config.bgColor,
    startAngle,
    endAngle,
    counterClockwise: false,
  })

  mainRing.set({
    radius: Number(config.radius),
    strokeWidth: Number(config.strokeWidth),
    stroke: config.color,
    startAngle,
    endAngle: progressAngle,
    counterClockwise,
  })

  group.set({
    left: config.left,
    top: config.top,
    startAngle,
    endAngle,
    counterClockwise,
    goalProperty: config.goalProperty,
    progress,
  } as any)

  refreshGroup(group)
}

export function updateGoalArc(element: FabricElement, patch: Partial<GoalArcElementConfig> = {}): void {
  const group = element as unknown as Group
  const canvas = useCanvasStore().canvas
  const elementDataStore = useElementDataStore()

  const ensured = ensureWidget(group)
  const currentConfig = ensured?.config
  if (!currentConfig) return

  console.log(`updateGoalArc patch.left: ${patch.left}, patch.top: ${patch.top}; currentConfig.left: ${currentConfig.left}, currentConfig.top: ${currentConfig.top}; group.left: ${(group as any).left}, group.top: ${(group as any).top}` )
  const nextConfig: GoalArcElementConfig = {
    ...currentConfig,
    ...patch,
    id: currentConfig.id,
    eleType: 'goalArc',
    // 始终以当前 group 的实际位置为准：优先 patch，其次 group，最后才是旧 config
    left: Number(patch.left ?? (group as any).left ?? currentConfig.left ?? 0),
    top: Number(patch.top ?? (group as any).top ?? currentConfig.top ?? 0),
    progress: clampProgress(patch.progress ?? currentConfig.progress ?? 0),
  }

  console.log('updateGoalArc nextConfig', nextConfig)

  const elementMeta = getElement(group)
  if (elementMeta) {
    elementMeta.config = nextConfig
  }

  layoutGoalArc(group)
  canvas?.requestRenderAll?.()

  try {
    const encoded = encodeGoalArc(group as any)
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
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) return

    const s = Math.max(0.0001, Math.max(Math.abs(sx), Math.abs(sy)))
    if (Math.abs(s - 1) < 0.001) return

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

import { Group, Rect } from 'fabric'
import { nanoid } from 'nanoid'
import { decodeColor } from '@/utils/colorUtils'
import type { BatteryElementConfig } from '@/types/elements/battery'
import type { FabricElement } from '@/types/element'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import * as elementManager from '@/engine/managers/elementManager'
import { DEFAULT_LEVEL_COLOR_HIGH, DEFAULT_LEVEL_COLOR_LOW, DEFAULT_LEVEL_COLOR_MEDIUM, encodeBattery, resolveBatteryParts } from '@/elements/status/battery/battery.encoder'
import type { ElementUpdateContext } from '@/engine/registry/elementRegistry'
import { createBatterySegmentClip, normalizeBatterySegments } from './battery.segments'

function getLevelColor(
  level: number,
  levelColorLow?: string | null,
  levelColorMedium?: string | null,
  levelColorHigh?: string | null,
) {
  const low = levelColorLow ?? DEFAULT_LEVEL_COLOR_LOW
  const medium = levelColorMedium ?? DEFAULT_LEVEL_COLOR_MEDIUM
  const high = levelColorHigh ?? DEFAULT_LEVEL_COLOR_HIGH
  if (level <= 0.2) return low
  if (level <= 0.5) return medium
  return high
}

// Use the same local geometry for creation and updates; dimensions remain physical X/Y sizes.
function batteryGeometry(width: number, height: number,
  padding: number, headGap: number, level: number, vertical: boolean) {
  const innerWidth = Math.max(0, width - padding * 2)
  const innerHeight = Math.max(0, height - padding * 2)
  const charge = Math.min(1, Math.max(0, Number.isFinite(level) ? level : 0))
  if (vertical) {
    return {
      body: { originX: 'center', originY: 'center', left: 0, top: 0 },
      head: { originX: 'center', originY: 'bottom', left: 0, top: -height / 2 - headGap, strokeWidth: 0 },
      level: { originX: 'left', originY: 'top', left: -width / 2 + padding,
        top: height / 2 - padding - innerHeight * charge, width: innerWidth, height: innerHeight * charge, strokeWidth: 0 },
    } as const
  }
  return {
    body: { originX: 'left', originY: 'center', left: -width / 2, top: 0 },
    head: { originX: 'left', originY: 'center', left: width / 2 + headGap, top: 0, strokeWidth: 1 },
    level: { originX: 'left', originY: 'center', left: -width / 2 + padding, top: 0,
      width: innerWidth * charge, height: innerHeight, strokeWidth: 1 },
  } as const
}

export function createBattery(config: BatteryElementConfig): FabricElement {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const canvas = canvasStore.canvas
  if (!canvas) throw new Error('Canvas is not initialized')

  const id = (config.id && String(config.id).trim().length > 0)
    ? String(config.id)
    : nanoid()
  const orientation = config.orientation === 'vertical' ? 'vertical' : 'horizontal'
  const vertical = orientation === 'vertical'
  const width = config.width ?? (vertical ? 18 : 28)
  const height = config.height ?? (vertical ? 28 : 18)
  const headWidth = Math.round(config.headWidth ?? width * (vertical ? 0.5 : 0.08))
  const headHeight = Math.round(config.headHeight ?? height * (vertical ? 0.08 : 0.5))
  const padding = Math.round(config.padding ?? 2)
  const level = config.level ?? 0.5
  const headGap = Math.round(config.headGap ?? 1)

  const bodyStrokeWidth = config.bodyStrokeWidth ?? 2
  const bodyStroke = config.bodyStroke ?? '#ffffff'
  const bodyFill = config.bodyFill ?? 'transparent'
  const bodyRx = config.bodyRx ?? height * 0.1
  const bodyRy = config.bodyRy ?? height * 0.1

  const headFill = config.headFill ?? bodyStroke
  const headRx = Math.round(config.headRx ?? headWidth * 0.2)
  const headRy = Math.round(config.headRy ?? headWidth * 0.2)

  const geometry = batteryGeometry(width, height, padding, headGap, level, vertical)
  const segmentOptions = normalizeBatterySegments(config)

  const batteryBody: any = new Rect({
    width,
    height,
    fill: decodeColor(bodyFill),
    stroke: bodyStroke,
    strokeWidth: bodyStrokeWidth,
    rx: bodyRx,
    ry: bodyRy,
    id: id + '_body',
    ...geometry.body,
  })

  const batteryHead: any = new Rect({
    width: headWidth,
    height: headHeight,
    fill: headFill,
    rx: headRx,
    ry: headRy,
    id: id + '_head',
    ...geometry.head,
  })

  const colorLow = config.levelColorLow ?? DEFAULT_LEVEL_COLOR_LOW
  const colorMedium = config.levelColorMedium ?? DEFAULT_LEVEL_COLOR_MEDIUM
  const colorHigh = config.levelColorHigh ?? DEFAULT_LEVEL_COLOR_HIGH

  const batteryLevel: any = new Rect({
    fill: getLevelColor(level, colorLow, colorMedium, colorHigh),
    id: id + '_level',
    ...geometry.level,
    ...(segmentOptions.segmentMode ? { strokeWidth: 0 } : {}),
    clipPath: createBatterySegmentClip({ ...config, width, height, padding }, geometry.level.width, geometry.level.height),
  })

  const group: any = new Group([
    batteryBody,
    batteryHead,
    batteryLevel,
  ], {
    left: config.left,
    top: config.top,
    id,
    eleType: 'battery',
    orientation,
    ...segmentOptions,
    selectable: true,
    hasControls: false,
    hasBorders: true,
    originX: 'center',
    originY: 'center',
    padding,
    headGap,
    levelColorLow: colorLow,
    levelColorLowProperty: config.levelColorLowProperty,
    levelColorMedium: colorMedium,
    levelColorMediumProperty: config.levelColorMediumProperty,
    levelColorHigh: colorHigh,
    levelColorHighProperty: config.levelColorHighProperty,
    bodyStrokeProperty: config.bodyStrokeProperty,
    bodyFillProperty: config.bodyFillProperty,
    headFillProperty: config.headFillProperty,
  } as any)

  ;(group as any)._body = batteryBody
  ;(group as any)._head = batteryHead
  ;(group as any)._level = batteryLevel

  group.setCoords()
  canvas.add(group)
  elementManager.registerElementInstance(group as FabricElement)
  layerStore.addLayer(group as any)
  canvas.requestRenderAll?.()
  canvas.discardActiveObject()
  canvas.setActiveObject(group)

  return group as FabricElement
}

export function updateBattery(
  element: FabricElement,
  patch: Partial<BatteryElementConfig> = {},
  _context: ElementUpdateContext = {},
): void {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas) return

  // 先根据当前元素编码出完整配置，然后叠加补丁
  const baseConfig = encodeBattery(element)
  const next: BatteryElementConfig = {
    ...baseConfig,
    ...patch,
  }

  const groupFromRegistry = elementManager.getElementById((element as any).id) as any
  const group: any = groupFromRegistry as any
  if (!group) return

  const parts = resolveBatteryParts(group)
  if (!parts) return
  const batteryBody = parts.body
  const batteryHead = parts.head
  const batteryLevel = parts.level

  const width = next.width ?? baseConfig.width ?? 28
  const height = next.height ?? baseConfig.height ?? 18

  const orientation = next.orientation === 'vertical' ? 'vertical' : 'horizontal'
  const nextHeadGap = next.headGap ?? 2
  const headWidth = next.headWidth ?? baseConfig.headWidth ?? Math.round(width * 0.08)
  const headHeight = next.headHeight ?? baseConfig.headHeight ?? Math.round(height * 0.5)
  const padding = next.padding ?? 2
  const level = next.level ?? baseConfig.level ?? 0
  const geometry = batteryGeometry(width, height, padding, nextHeadGap, level, orientation === 'vertical')
  const position = { left: next.left ?? group.left, top: next.top ?? group.top }

  batteryBody.set({
    width,
    height,
    fill: next.bodyFill,
    stroke: next.bodyStroke,
    strokeWidth: next.bodyStrokeWidth,
    rx: next.bodyRx,
    ry: next.bodyRy,
    ...geometry.body,
  })

  batteryHead.set({
    width: headWidth,
    height: headHeight,
    fill: next.headFill,
    rx: next.headRx,
    ry: next.headRy,
    ...geometry.head,
  })

  const nextLow = (next.levelColorLow ?? (group as any).levelColorLow ?? DEFAULT_LEVEL_COLOR_LOW) as string
  const nextMedium = (next.levelColorMedium ?? (group as any).levelColorMedium ?? DEFAULT_LEVEL_COLOR_MEDIUM) as string
  const nextHigh = (next.levelColorHigh ?? (group as any).levelColorHigh ?? DEFAULT_LEVEL_COLOR_HIGH) as string

  batteryLevel.set({
    fill: getLevelColor(level, nextLow, nextMedium, nextHigh),
    ...geometry.level,
    ...(next.segmentMode ? { strokeWidth: 0 } : {}),
    clipPath: createBatterySegmentClip({ ...next, width, height, padding }, geometry.level.width, geometry.level.height),
  })

  group.set(normalizeBatterySegments(next))
  ;(group as any).set('orientation', orientation)
  ;(group as any).set('padding', padding)
  ;(group as any).set('headGap', nextHeadGap)

  if (next.left !== undefined) group.set('left', next.left)
  if (next.top !== undefined) group.set('top', next.top)
  if (next.levelColorLow !== undefined) (group as any).set('levelColorLow', nextLow)
  if (patch.levelColorLowProperty !== undefined) (group as any).set('levelColorLowProperty', patch.levelColorLowProperty)
  if (next.levelColorMedium !== undefined) (group as any).set('levelColorMedium', nextMedium)
  if (patch.levelColorMediumProperty !== undefined) (group as any).set('levelColorMediumProperty', patch.levelColorMediumProperty)
  if (next.levelColorHigh !== undefined) (group as any).set('levelColorHigh', nextHigh)
  if (patch.levelColorHighProperty !== undefined) (group as any).set('levelColorHighProperty', patch.levelColorHighProperty)
  if (patch.bodyStrokeProperty !== undefined) (group as any).set('bodyStrokeProperty', patch.bodyStrokeProperty)
  if (patch.bodyFillProperty !== undefined) (group as any).set('bodyFillProperty', patch.bodyFillProperty)
  if (patch.headFillProperty !== undefined) (group as any).set('headFillProperty', patch.headFillProperty)

  ;(group as any)._body = batteryBody
  ;(group as any)._head = batteryHead
  ;(group as any)._level = batteryLevel

  group.triggerLayout?.()
  group.set(position)
  group.setCoords()
  canvas.requestRenderAll?.()
}

export function updateBatteryLevel(element: FabricElement, level: number): void {
  updateBattery(element, { level })
}

import type { FabricElement } from '@/types/element'
import type { BatteryElementConfig } from '@/types/elements/battery'

export const DEFAULT_LEVEL_COLOR_LOW = '#ff0000'
export const DEFAULT_LEVEL_COLOR_MEDIUM = '#ffaa00'
export const DEFAULT_LEVEL_COLOR_HIGH = '#00ff00'

type BatteryParts = {
  body: any
  head: any
  level: any
}

export function resolveBatteryParts(element: Partial<FabricElement>): BatteryParts | null {
  if (!element) return null

  const anyElement = element as any
  let body: any = anyElement._body
  let head: any = anyElement._head
  let level: any = anyElement._level

  if (!body || !head || !level) {
    const objects: any[] = typeof anyElement.getObjects === 'function'
      ? anyElement.getObjects()
      : Array.isArray(anyElement._objects)
        ? anyElement._objects
        : []

    body ||= objects.find((obj) => String(obj?.id ?? '').endsWith('_body'))
    head ||= objects.find((obj) => String(obj?.id ?? '').endsWith('_head'))
    level ||= objects.find((obj) => String(obj?.id ?? '').endsWith('_level'))

    if ((!body || !head || !level) && objects.length >= 3) {
      body ||= objects[0]
      head ||= objects[1]
      level ||= objects[2]
    }
  }

  if (!body || !head || !level) return null

  anyElement._body = body
  anyElement._head = head
  anyElement._level = level

  return { body, head, level }
}

export function encodeBattery(element: Partial<FabricElement>): BatteryElementConfig {
  if (!element) {
    throw new Error('Invalid element')
  }

  const anyElement = element as any
  const parts = resolveBatteryParts(element)
  if (!parts) {
    throw new Error('Invalid element')
  }
  const batteryBody = parts.body
  const batteryHead = parts.head
  const batteryLevel = parts.level

  const safePadding = Math.round(((anyElement.padding ?? 4) as number))

  const config: BatteryElementConfig = {
    id: String(anyElement.id ?? ''),
    eleType: 'battery',
    originX: (anyElement.originX ?? 'center') as any,
    originY: (anyElement.originY ?? 'center') as any,
    left: Math.round((anyElement.left ?? 0) as number),
    top: Math.round((anyElement.top ?? 0) as number),
    width: Math.round((batteryBody.width as number)),
    height: Math.round((batteryBody.height as number)),
    bodyStroke: batteryBody.stroke,
    bodyFill: batteryBody.fill,
    bodyStrokeWidth: Math.round(((batteryBody.strokeWidth ?? 0) as number)),
    bodyRx: Math.round(((batteryBody.rx ?? 0) as number)),
    bodyRy: Math.round(((batteryBody.ry ?? 0) as number)),
    headWidth: Math.round((batteryHead.width as number)),
    headHeight: Math.round((batteryHead.height as number)),
    headFill: batteryHead.fill,
    headRx: Math.round(((batteryHead.rx ?? 0) as number)),
    headRy: Math.round(((batteryHead.ry ?? 0) as number)),
    padding: safePadding,
    level: Number(((batteryLevel.width as number) / ((batteryBody.width as number) - safePadding * 2)).toFixed(2)),
    levelColorLow: (anyElement.levelColorLow ?? DEFAULT_LEVEL_COLOR_LOW) as string,
    levelColorMedium: (anyElement.levelColorMedium ?? DEFAULT_LEVEL_COLOR_MEDIUM) as string,
    levelColorHigh: (anyElement.levelColorHigh ?? DEFAULT_LEVEL_COLOR_HIGH) as string,
    headGap: Math.round(((anyElement.headGap ?? 2) as number)),
  }

  return config
}

export function decodeBattery(config: BatteryElementConfig): Partial<FabricElement> {
  const decoded: Partial<FabricElement> = {
    eleType: 'battery',
    left: config.left,
    top: config.top,
    width: config.width,
    height: config.height,
    bodyStroke: config.bodyStroke,
    bodyFill: config.bodyFill,
    bodyStrokeWidth: config.bodyStrokeWidth,
    bodyRx: config.bodyRx,
    bodyRy: config.bodyRy,
    headWidth: config.headWidth,
    headHeight: config.headHeight,
    headFill: config.headFill,
    headRx: config.headRx,
    headRy: config.headRy,
    padding: config.padding,
    level: config.level,
    levelColorLow: config.levelColorLow ?? DEFAULT_LEVEL_COLOR_LOW,
    levelColorMedium: config.levelColorMedium ?? DEFAULT_LEVEL_COLOR_MEDIUM,
    levelColorHigh: config.levelColorHigh ?? DEFAULT_LEVEL_COLOR_HIGH,
    headGap: config.headGap ?? 2,
  }

  return decoded
}

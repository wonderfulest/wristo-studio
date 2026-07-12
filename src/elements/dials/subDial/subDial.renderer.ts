import { Circle, Group, Image as FabricImage, Line, Text, Triangle, type FabricObject } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { SubDialElementConfig } from '@/types/elements/subDial'
import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useLayerStore } from '@/stores/layerStore'
import { applyControlsToObject } from '@/utils/controlManager'
import { clampPivot, normalizeSubDialValue, resolveSubDialAngle } from './subDial.math'
import { encodeSubDial } from './subDial.encoder'
import { migrateSubDialConfig } from './subDial.migration'

type SubDialChildren = {
  background: FabricObject
  majorTicks: Group
  minorTicks: Group
  pointer: FabricObject
  centerCap: FabricObject
  valueText: Text
  unitText: Text
}

type SubDialWidget = {
  kind: 'widget'
  type: 'subDial'
  config: SubDialElementConfig
  children: SubDialChildren
}

function nonEmptyString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)
}

function resolveSweep(config: SubDialElementConfig): number {
  let sweep = config.endAngle - config.startAngle
  if (config.counterClockwise && sweep > 0) sweep -= 360
  if (!config.counterClockwise && sweep < 0) sweep += 360
  return sweep
}

function pointAt(radius: number, angle: number): { x: number; y: number } {
  const radians = angle * Math.PI / 180
  return { x: Math.cos(radians) * radius, y: Math.sin(radians) * radius }
}

function buildTicks(config: SubDialElementConfig, count: number, major: boolean): Group {
  if (count <= 0 || (major ? !config.showMajorTicks : !config.showMinorTicks)) return new Group([])
  const sweep = resolveSweep(config)
  const steps = config.showEndpointTicks ? Math.max(1, count - 1) : count + 1
  const indexes = Array.from({ length: count }, (_, index) => index + (config.showEndpointTicks ? 0 : 1))
  const outerRadius = config.radius * 0.9
  const innerRadius = outerRadius - config.radius * (major ? 0.14 : 0.08)
  const color = major ? config.majorTickColor : config.minorTickColor
  const lines = indexes.map((index) => {
    const angle = config.startAngle + sweep * (index / steps)
    const outer = pointAt(outerRadius, angle)
    const inner = pointAt(innerRadius, angle)
    return new Line([inner.x, inner.y, outer.x, outer.y], {
      stroke: color,
      strokeWidth: major ? 2 : 1,
      selectable: false,
      evented: false,
    })
  })
  return new Group(lines, { selectable: false, evented: false })
}

async function buildPointer(config: SubDialElementConfig): Promise<FabricObject> {
  const pointer = config.pointer
  const length = config.radius * pointer.lengthRatio
  if (pointer.style === 'image' && pointer.imageUrl) {
    const image = await FabricImage.fromURL(pointer.imageUrl, { crossOrigin: 'anonymous' } as any)
    const width = Math.max(1, Number(image.width ?? 1))
    const height = Math.max(1, Number(image.height ?? 1))
    const scale = length * pointer.scale / height
    const displayWidth = width * scale
    const displayHeight = height * scale
    image.set({
      left: (0.5 - clampPivot(pointer.pivotX)) * displayWidth,
      top: (0.5 - clampPivot(pointer.pivotY)) * displayHeight,
      originX: 'center',
      originY: 'center',
      scaleX: scale,
      scaleY: scale,
      selectable: false,
      evented: false,
    })
    return new Group([image], {
      left: 0,
      top: 0,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    })
  }

  if (pointer.style === 'triangle') {
    const pivotAnchor = new Circle({
      left: 0,
      top: 0,
      radius: length,
      fill: 'transparent',
      opacity: 0,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    })
    const triangle = new Triangle({
      left: 0,
      top: -length / 2,
      width: Math.max(2, pointer.width * 2),
      height: length,
      fill: pointer.color,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    })
    return new Group([pivotAnchor, triangle], {
      left: 0,
      top: 0,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    })
  }

  return new Line([0, 0, 0, -length], {
    left: 0,
    top: 0,
    stroke: pointer.color,
    strokeWidth: pointer.width,
    originX: 'center',
    originY: 'bottom',
    selectable: false,
    evented: false,
  })
}

function formatValue(config: SubDialElementConfig): string {
  return Number(config.previewValue).toFixed(Math.max(0, Math.min(6, config.content.value.decimals)))
}

async function buildChildren(config: SubDialElementConfig): Promise<SubDialChildren> {
  const value = config.content.value
  const unit = config.content.unit
  const background = new Circle({
    radius: config.radius,
    fill: config.backgroundColor,
    opacity: config.backgroundOpacity,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
  })
  const pointer = await buildPointer(config)
  const centerCap = new Circle({
    radius: config.showCenterCap ? config.centerCapRadius : 0,
    fill: config.centerCapColor,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
  })
  const valueText = new Text(formatValue(config), {
    left: 0,
    top: config.radius * 0.42,
    fill: value.color,
    fontSize: value.fontSize,
    originX: 'center',
    originY: 'center',
    visible: value.visible,
    selectable: false,
    evented: false,
  })
  const unitText = new Text(unit.suffix, {
    left: 0,
    top: config.radius * 0.68,
    fill: unit.color,
    fontSize: unit.fontSize,
    originX: 'center',
    originY: 'center',
    visible: unit.visible,
    selectable: false,
    evented: false,
  })
  const children = {
    background,
    majorTicks: buildTicks(config, config.majorTicks, true),
    minorTicks: buildTicks(config, config.minorTicks, false),
    pointer,
    centerCap,
    valueText,
    unitText,
  }
  updateDynamicChildren(children, config)
  return children
}

function updateDynamicChildren(children: SubDialChildren, config: SubDialElementConfig): void {
  const minValue = config.rangeMode === 'percentage' ? 0 : config.minValue
  const maxValue = config.rangeMode === 'percentage' ? 100 : config.maxValue
  const progress = normalizeSubDialValue(config.previewValue, minValue, maxValue, config.outOfRangeBehavior)
  const visible = progress !== null
  const dataAngle = progress === null
    ? config.startAngle + config.pointer.rotationOffset
    : resolveSubDialAngle(progress, config.startAngle, config.endAngle, config.counterClockwise, config.pointer.rotationOffset)
  children.pointer.set({
    // Fabric pointer geometry points upward; dial angles use 3 o'clock as 0°.
    angle: dataAngle + 90,
    visible,
  })
  children.valueText.set({ text: formatValue(config), visible: config.content.value.visible && visible })
  children.unitText.set({
    text: config.content.unit.suffix,
    visible: config.content.unit.visible && visible,
  })
}

function needsStructuralRebuild(patch: Partial<SubDialElementConfig>): boolean {
  return Object.keys(patch).some((key) => ![
    'previewValue', 'goalProperty', 'rangeMode', 'minValue', 'maxValue', 'outOfRangeBehavior',
    'showValue', 'showUnit', 'unit', 'decimals', 'valueColor', 'valueFontSize', 'left', 'top', 'rotation',
  ].includes(key))
}

function getWidget(group: Group): SubDialWidget {
  return (group as any).__element as SubDialWidget
}

export async function createSubDial(input: SubDialElementConfig): Promise<FabricElement> {
  const canvas = useCanvasStore().canvas
  if (!canvas) throw new Error('Canvas is not initialized, cannot add sub-dial element')
  const config: SubDialElementConfig = {
    ...migrateSubDialConfig(input),
    id: input.id || nanoid(),
    eleType: 'subDial',
  }
  const children = await buildChildren(config)
  const group = new Group(Object.values(children), {
    id: config.id,
    eleType: 'subDial',
    designerControlMode: 'corner4',
    left: config.left,
    top: config.top,
    angle: config.rotation,
    originX: config.originX,
    originY: config.originY,
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
    subTargetCheck: false,
    progressProperty: config.progressProperty,
  } as any) as Group & FabricElement
  ;(group as any).__element = { kind: 'widget', type: 'subDial', config, children } satisfies SubDialWidget
  applyControlsToObject(group)
  canvas.add(group)
  useLayerStore().addLayer(group as any)
  canvas.setActiveObject(group)
  canvas.requestRenderAll?.()
  useElementDataStore().upsertElement(encodeSubDial(group))
  return group
}

export async function updateSubDial(element: FabricElement, patch: Partial<SubDialElementConfig>): Promise<void> {
  const group = element as unknown as Group & FabricElement
  const widget = getWidget(group)
  if (!widget?.config) throw new Error('Invalid sub-dial element')
  const liveLeft = Number.isFinite(Number((group as any).left))
    ? Number((group as any).left)
    : widget.config.left
  const liveTop = Number.isFinite(Number((group as any).top))
    ? Number((group as any).top)
    : widget.config.top
  const liveRotation = Number.isFinite(Number((group as any).angle))
    ? Number((group as any).angle)
    : widget.config.rotation
  const config: SubDialElementConfig = migrateSubDialConfig({
    ...widget.config,
    ...patch,
    progressProperty: nonEmptyString(
      patch.progressProperty,
      patch.goalProperty,
      widget.config.progressProperty
    ),
    // Fabric may rewrite Group coordinates while children are replaced. Lock the
    // business position before rebuilding; only an explicit transform patch may change it.
    left: patch.left !== undefined ? Number(patch.left) : liveLeft,
    top: patch.top !== undefined ? Number(patch.top) : liveTop,
    rotation: patch.rotation !== undefined ? Number(patch.rotation) : liveRotation,
    pointer: { ...widget.config.pointer, ...(patch.pointer ?? {}) },
    content: {
      icon: { ...widget.config.content.icon, ...patch.content?.icon },
      label: { ...widget.config.content.label, ...patch.content?.label },
      value: {
        ...widget.config.content.value,
        ...(patch.showValue === undefined ? {} : { visible: patch.showValue }),
        ...(patch.decimals === undefined ? {} : { decimals: patch.decimals }),
        ...(patch.valueColor === undefined ? {} : { color: patch.valueColor }),
        ...(patch.valueFontSize === undefined ? {} : { fontSize: patch.valueFontSize }),
        ...patch.content?.value,
      },
      unit: {
        ...widget.config.content.unit,
        ...(patch.showUnit === undefined ? {} : { visible: patch.showUnit }),
        ...(patch.unit === undefined ? {} : { suffix: patch.unit }),
        ...patch.content?.unit,
      },
      goalValue: { ...widget.config.content.goalValue, ...patch.content?.goalValue },
      percentage: { ...widget.config.content.percentage, ...patch.content?.percentage },
    },
  })

  if (patch.left !== undefined) group.set('left', patch.left)
  if (patch.top !== undefined) group.set('top', patch.top)
  if (patch.rotation !== undefined) group.set('angle', patch.rotation)
  if (patch.progressProperty !== undefined || patch.goalProperty !== undefined) {
    group.set('progressProperty', config.progressProperty)
  }

  if (needsStructuralRebuild(patch)) {
    const nextChildren = await buildChildren(config)
    group.getObjects().slice().forEach((child) => group.remove(child))
    Object.values(nextChildren).forEach((child) => group.add(child))
    widget.children = nextChildren
  } else {
    updateDynamicChildren(widget.children, config)
    widget.children.valueText.set({ fill: config.content.value.color, fontSize: config.content.value.fontSize })
    widget.children.unitText.set({ fill: config.content.unit.color, fontSize: config.content.unit.fontSize })
  }

  group.set({ left: config.left, top: config.top, angle: config.rotation } as any)
  widget.config = config
  group.setCoords()
  useCanvasStore().canvas?.requestRenderAll?.()
  useElementDataStore().upsertElement(encodeSubDial(group))
}

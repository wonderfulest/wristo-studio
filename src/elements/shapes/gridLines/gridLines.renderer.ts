import { Group, Line, Rect } from 'fabric'
import { nanoid } from 'nanoid'
import type { GridLinesElementConfig } from '@/types/elements'
import type { FabricElement } from '@/types/element'
import type { ElementUpdateContext } from '@/engine/registry/elementRegistry'
import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useLayerStore } from '@/stores/layerStore'
import { applyControlsToObject } from '@/utils/controlManager'
import { getDisplayState, normalizeDisplayStates } from '@/utils/displayStates'
import { encodeGridLines } from './gridLines.encoder'
import { buildGridLineSegments, normalizeGridLinesSize } from './gridLines.geometry'
import { gridLinesSchema } from './gridLines.schema'

function createGridChildren(config: Pick<GridLinesElementConfig, 'width' | 'height' | 'spacing' | 'lineWidth' | 'color'>) {
  const width = Number(config.width)
  const height = Number(config.height)
  const base = new Rect({
    left: -width / 2,
    top: -height / 2,
    width,
    height,
    fill: 'transparent',
    strokeWidth: 0,
    selectable: false,
    evented: false,
  })
  const lines = buildGridLineSegments(width, height, config.spacing).map((segment) => new Line(segment, {
    stroke: config.color,
    strokeWidth: Number(config.lineWidth),
    strokeUniform: true,
    selectable: false,
    evented: false,
  }))
  return [base, ...lines]
}

export function createGridLinesGroup(config: GridLinesElementConfig): Group {
  const width = Number(config.width)
  const height = Number(config.height)
  const rotation = Number(config.rotation ?? 0)
  const group = new Group(createGridChildren(config), {
    id: config.id,
    eleType: 'gridLines',
    designerControlMode: 'resize8Rotate',
    left: Number(config.left),
    top: Number(config.top),
    width,
    height,
    angle: rotation,
    originX: config.originX ?? 'center',
    originY: config.originY ?? 'center',
    selectable: true,
    hasControls: true,
    hasBorders: true,
    lockScalingFlip: true,
  } as any)
  group.set({
    width,
    height,
    spacing: Number(config.spacing),
    lineWidth: Number(config.lineWidth),
    color: config.color,
    colorProperty: config.colorProperty ?? null,
    rotation,
  } as any)
  return group
}

function rebuildGridLinesGroup(group: Group): void {
  const grid = group as any
  const left = group.left
  const top = group.top
  const angle = group.angle
  const width = Number(group.width)
  const height = Number(group.height)
  group.remove(...group.getObjects())
  group.add(...createGridChildren({
    width,
    height,
    spacing: Number(grid.spacing),
    lineWidth: Number(grid.lineWidth),
    color: String(grid.color),
  }))
  group.set({ left, top, angle, width, height })
  group.setCoords()
}

export function bakeGridLinesTransform(group: Group): void {
  const size = normalizeGridLinesSize(group.width, group.height, group.scaleX, group.scaleY)
  group.set({
    width: size.width,
    height: size.height,
    scaleX: 1,
    scaleY: 1,
  })
  rebuildGridLinesGroup(group)
}

function persistGridLines(group: Group): void {
  const grid = group as any
  if (grid.id == null) return
  useElementDataStore().patchElement(String(grid.id), {
    ...encodeGridLines(group as unknown as FabricElement),
    displayStates: normalizeDisplayStates(grid.displayStates),
  } as any)
}

function attachGridLinesSync(group: Group): void {
  group.on('modified', () => {
    bakeGridLinesTransform(group)
    ;(group as any).rotation = Number(group.angle ?? 0)
    persistGridLines(group)
    group.canvas?.requestRenderAll?.()
  })
}

export async function createGridLines(config: GridLinesElementConfig): Promise<FabricElement> {
  const canvas = useCanvasStore().canvas
  if (!canvas) throw new Error('Canvas is not initialized, cannot add Grid Lines element')
  const defaults = gridLinesSchema.defaultConfig
  const layerStore = useLayerStore()
  const displayStates = normalizeDisplayStates(config.displayStates)
  const normalizedConfig: GridLinesElementConfig = {
    ...config,
    id: config.id || nanoid(),
    width: Math.max(1, Number(config.width ?? defaults.width) || defaults.width),
    height: Math.max(1, Number(config.height ?? defaults.height) || defaults.height),
    spacing: Math.max(1, Number(config.spacing ?? defaults.spacing) || defaults.spacing),
    lineWidth: Math.max(1, Number(config.lineWidth ?? defaults.lineWidth) || defaults.lineWidth),
    color: config.color ?? defaults.color,
    colorProperty: config.colorProperty ?? defaults.colorProperty,
    rotation: Number(config.rotation ?? defaults.rotation) || 0,
  }
  const group = createGridLinesGroup(normalizedConfig)
  group.set({
    displayStates,
    visible: getDisplayState(displayStates, layerStore.previewMode),
  } as any)
  attachGridLinesSync(group)
  applyControlsToObject(group)

  useElementDataStore().upsertElement({
    ...normalizedConfig,
    displayStates,
  } as any)
  canvas.add(group as any)
  layerStore.addLayer(group as any)
  canvas.setActiveObject(group as any)
  canvas.requestRenderAll()
  return group as unknown as FabricElement
}

export function updateGridLines(
  element: FabricElement,
  patch: Partial<GridLinesElementConfig> = {},
  context: ElementUpdateContext = {},
): void {
  const group = element as unknown as Group
  const grid = group as any
  if (!group) return

  if (patch.left !== undefined) group.set('left', Number(patch.left))
  if (patch.top !== undefined) group.set('top', Number(patch.top))
  if (patch.width !== undefined) group.set('width', Math.max(1, Number(patch.width) || 1))
  if (patch.height !== undefined) group.set('height', Math.max(1, Number(patch.height) || 1))
  if (patch.spacing !== undefined) grid.spacing = Math.max(1, Number(patch.spacing) || 1)
  if (patch.lineWidth !== undefined) grid.lineWidth = Math.max(1, Number(patch.lineWidth) || 1)
  if (patch.color !== undefined) grid.color = patch.color
  if (patch.colorProperty !== undefined) grid.colorProperty = patch.colorProperty
  if (patch.rotation !== undefined) {
    const rotation = Number(patch.rotation) || 0
    group.set('angle', rotation)
    grid.rotation = rotation
  }
  if (patch.displayStates !== undefined) {
    grid.displayStates = normalizeDisplayStates(patch.displayStates)
    group.set('visible', getDisplayState(grid.displayStates, useLayerStore().previewMode))
  }

  rebuildGridLinesGroup(group)
  group.set('dirty', true)
  group.canvas?.requestRenderAll?.()

  if (context.persist !== false && grid.id != null) {
    persistGridLines(group)
  }
}

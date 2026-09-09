import { Circle, Group, LayoutManager, FixedLayout, Path, Rect, type FabricObject } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { WorldMapElementConfig } from '@/types/elements/worldMap'
import type { ElementUpdateContext } from '@/engine/registry/elementRegistry'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { normalizeWorldMap, projectWorldMapLocation, worldMapData, WORLD_MAP_COLOR, WORLD_MAP_GRID_COLOR } from './worldMap.model'
import { encodeWorldMap } from './worldMap.encoder'

export function buildWorldMapObjects(config: WorldMapElementConfig): FabricObject[] {
  const { width, height } = config
  const common = { selectable: false, evented: false, originX: 'center' as const, originY: 'center' as const }
  const objects: FabricObject[] = [new Rect({ ...common, left: 0, top: 0, width, height, fill: 'transparent', strokeWidth: 0 })]
  // Path offsets come from actual geometry; account for them rather than recentering the land.
  for (const [path, fill, stroke] of [
    [worldMapData.gridPath, 'transparent', WORLD_MAP_GRID_COLOR],
    [worldMapData.landPath, WORLD_MAP_COLOR, undefined]
  ]) {
    const shape = new Path(path!, { ...common, fill, stroke, strokeWidth: stroke ? 0.5 : 0, opacity: config.mapOpacity })
    shape.set({ left: ((shape.pathOffset.x - 180) * width) / 360, top: ((shape.pathOffset.y - 90) * height) / 180, scaleX: width / 360, scaleY: height / 180 })
    objects.push(shape)
  }
  const point = projectWorldMapLocation(config, config.previewLatitude, config.previewLongitude)
  if (point) {
    const center = { ...common, left: point.x - config.left, top: point.y - config.top }
    const radius = config.markerSize / 2
    objects.push(new Circle({ ...center, radius, fill: 'transparent', stroke: config.markerColor, strokeWidth: 1 }))
    objects.push(new Circle({ ...center, radius: Math.max(1, radius * 0.4), fill: config.markerColor, strokeWidth: 0 }))
  }
  return objects
}

export function createWorldMapGroup(config: WorldMapElementConfig): Group {
  const objects = buildWorldMapObjects(config)
  const positions = objects.map((object) => ({ left: object.left, top: object.top }))
  const group = new Group(objects, {
    width: config.width,
    height: config.height,
    left: config.left,
    top: config.top,
    originX: 'center',
    originY: 'center',
    objectCaching: false,
    layoutManager: new LayoutManager(new FixedLayout())
  })
  objects.forEach((object, index) => object.set(positions[index]))
  Object.assign(group, {
    id: config.id,
    eleType: 'worldMap',
    displayStates: config.displayStates,
    visibility: config.visibility,
    layerName: config.layerName,
    __element: { config: JSON.parse(JSON.stringify(config)) }
  })
  group.setControlsVisibility({ mtr: false })
  group.clipPath = new Rect({ width: config.width, height: config.height, originX: 'center', originY: 'center', strokeWidth: 0 })
  return group
}

export function updateWorldMap(element: FabricElement, patch: Partial<WorldMapElementConfig>, context?: ElementUpdateContext): void {
  const group = element as unknown as Group
  const config = normalizeWorldMap({ ...encodeWorldMap(element), ...patch })
  group.remove(...group.getObjects())
  group.set({ width: config.width, height: config.height, left: config.left, top: config.top, scaleX: 1, scaleY: 1, angle: 0 })
  const objects = buildWorldMapObjects(config)
  const positions = objects.map((object) => ({ left: object.left, top: object.top }))
  group.add(...objects)
  objects.forEach((object, index) => object.set(positions[index]))
  group.clipPath = new Rect({ width: config.width, height: config.height, originX: 'center', originY: 'center', strokeWidth: 0 })
  element.__element = { config: JSON.parse(JSON.stringify(config)) }
  group.setCoords()
  if (context?.persist !== false) useElementDataStore().upsertElement(config)
  useCanvasStore().canvas?.requestRenderAll()
}

export function createWorldMap(input: WorldMapElementConfig): FabricElement {
  const canvas = useCanvasStore().canvas
  if (!canvas) throw new Error('Canvas not initialized')
  const config = normalizeWorldMap({ ...input, id: input.id || nanoid() })
  const group = createWorldMapGroup(config) as unknown as FabricElement
  group.on('modified', () => updateWorldMap(group, {}))
  canvas.add(group)
  useElementDataStore().upsertElement(config)
  useLayerStore().addLayer(group as FabricElement & { eleType: string; id: string })
  canvas.setActiveObject(group)
  canvas.requestRenderAll()
  return group
}

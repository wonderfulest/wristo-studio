import { Circle, FabricText, Group, Path, Rect } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { ZoneMetricElementConfig } from '@/types/elements/data'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { getDisplayState, normalizeDisplayStates } from '@/utils/displayStates'
import { clampNumber, getPresetZones, resolvePresetDefaults, resolveZone, type ZoneMetricZone } from './zoneMetric.common'

type ZoneMetricResolvedConfig = {
  id: string
  eleType: 'zoneMetric'
  left: number
  top: number
  width: number
  height: number
  displayMode: ZoneMetricElementConfig['displayMode']
  zonePreset: ZoneMetricElementConfig['zonePreset']
  dataProperty: string
  value: number
  unit: string
  label: string
  zoneLabel: string
  showLabel: boolean
  showValue: boolean
  showUnit: boolean
  showZoneLabel: boolean
  fill: string
  textColor: string
  mutedTextColor: string
  inactiveColor: string
  borderColor: string
  borderWidth: number
  borderRadius: number
  ringThickness: number
  gap: number
  originX: ZoneMetricElementConfig['originX']
  originY: ZoneMetricElementConfig['originY']
  zones: ZoneMetricZone[]
}

function normalizeConfig(config: Partial<ZoneMetricElementConfig>, fallbackId?: string): ZoneMetricResolvedConfig {
  const zonePreset = (config.zonePreset || 'heartRate') as ZoneMetricResolvedConfig['zonePreset']
  const defaults = resolvePresetDefaults(zonePreset)
  const zones = getPresetZones(zonePreset, config.zones)
  const value = clampNumber(config.value, defaults.value)

  return {
    id: String(config.id || fallbackId || nanoid()),
    eleType: 'zoneMetric',
    left: clampNumber(config.left, 227),
    top: clampNumber(config.top, 227),
    width: clampNumber(config.width, 168, 48),
    height: clampNumber(config.height, 92, 48),
    displayMode: (config.displayMode || 'rectangle') as any,
    zonePreset,
    dataProperty: String(config.dataProperty || ''),
    value,
    unit: String(config.unit ?? defaults.unit),
    label: String(config.label ?? defaults.label),
    zoneLabel: String(config.zoneLabel ?? resolveZone(value, zones).label),
    showLabel: config.showLabel ?? true,
    showValue: config.showValue ?? true,
    showUnit: config.showUnit ?? true,
    showZoneLabel: config.showZoneLabel ?? true,
    fill: String(config.fill ?? '#0A161C'),
    textColor: String(config.textColor ?? '#FFFFFF'),
    mutedTextColor: String(config.mutedTextColor ?? '#9CCFDA'),
    inactiveColor: String(config.inactiveColor ?? '#334155'),
    borderColor: String(config.borderColor ?? '#9CCFDA'),
    borderWidth: clampNumber(config.borderWidth, 1, 0, 20),
    borderRadius: clampNumber(config.borderRadius, 14, 0, 80),
    ringThickness: clampNumber(config.ringThickness, 10, 2, 80),
    gap: clampNumber(config.gap, 3, 0, 20),
    originX: (config.originX || 'center') as any,
    originY: (config.originY || 'center') as any,
    zones,
  }
}

function segmentPath(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number): string {
  const rad = (deg: number) => (deg - 90) * Math.PI / 180
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  const p = (r: number, deg: number) => {
    const a = rad(deg)
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }
  }
  const o1 = p(outerR, startDeg)
  const o2 = p(outerR, endDeg)
  const i2 = p(innerR, endDeg)
  const i1 = p(innerR, startDeg)
  return `M ${o1.x} ${o1.y} A ${outerR} ${outerR} 0 ${largeArc} 1 ${o2.x} ${o2.y} L ${i2.x} ${i2.y} A ${innerR} ${innerR} 0 ${largeArc} 0 ${i1.x} ${i1.y} Z`
}

function makeText(text: string, left: number, top: number, fontSize: number, fill: string, fontWeight: string | number = 'normal') {
  return new FabricText(text, {
    left,
    top,
    originX: 'center',
    originY: 'center',
    fontFamily: 'Arial',
    fontSize,
    fontWeight,
    fill,
    selectable: false,
    evented: false,
  } as any)
}

function buildRectangle(config: ZoneMetricResolvedConfig) {
  const zone = resolveZone(config.value, config.zones)
  const left = -config.width / 2
  const top = -config.height / 2
  const children: any[] = [
    new Rect({
      left,
      top,
      width: config.width,
      height: config.height,
      rx: config.borderRadius,
      ry: config.borderRadius,
      originX: 'left',
      originY: 'top',
      fill: config.fill,
      stroke: config.borderColor,
      strokeWidth: config.borderWidth,
      selectable: false,
      evented: false,
    } as any),
  ]

  const swatchSize = Math.min(28, Math.max(12, config.height * 0.24))
  const swatchLeft = left + 18 + swatchSize / 2
  children.push(new Rect({
    left: swatchLeft,
    top: top + config.height / 2,
    width: swatchSize,
    height: swatchSize,
    rx: Math.max(3, swatchSize * 0.22),
    ry: Math.max(3, swatchSize * 0.22),
    originX: 'center',
    originY: 'center',
    fill: zone.color,
    selectable: false,
    evented: false,
  } as any))

  if (config.showLabel) {
    children.push(makeText(config.label, left + 22, top + 17, 13, config.mutedTextColor, 700))
  }
  if (config.showValue) {
    children.push(makeText(String(Math.round(config.value)), left + config.width * 0.55, top + config.height * 0.43, Math.max(22, config.height * 0.38), config.textColor, 500))
  }
  if (config.showUnit) {
    children.push(makeText(config.unit, left + config.width * 0.75, top + config.height * 0.72, 15, config.mutedTextColor, 700))
  }
  if (config.showZoneLabel) {
    children.push(makeText(zone.label, left + config.width * 0.54, top + config.height - 14, 12, zone.color, 700))
  }

  return children
}

function buildRing(config: ZoneMetricResolvedConfig) {
  const zone = resolveZone(config.value, config.zones)
  const size = Math.min(config.width, config.height)
  const outerR = Math.max(12, size / 2 - Math.max(2, config.borderWidth))
  const innerR = Math.max(4, outerR - config.ringThickness)
  const cx = 0
  const cy = 0
  const totalGap = config.gap * config.zones.length
  const span = (360 - totalGap) / Math.max(1, config.zones.length)
  const children: any[] = [
    new Circle({
      left: cx,
      top: cy,
      radius: outerR,
      originX: 'center',
      originY: 'center',
      fill: config.fill,
      stroke: config.borderColor,
      strokeWidth: config.borderWidth,
      selectable: false,
      evented: false,
    } as any),
  ]

  config.zones.forEach((item, index) => {
    const start = index * (span + config.gap)
    const end = start + span
    children.push(new Path(segmentPath(cx, cy, outerR, innerR, start, end), {
      fill: item.key === zone.key ? item.color : config.inactiveColor,
      stroke: '',
      selectable: false,
      evented: false,
    } as any))
  })

  if (config.showLabel) children.push(makeText(config.label, 0, -size * 0.18, 13, config.mutedTextColor, 700))
  if (config.showValue) children.push(makeText(String(Math.round(config.value)), 0, size * 0.04, Math.max(22, size * 0.22), config.textColor, 600))
  if (config.showUnit) children.push(makeText(config.unit, 0, size * 0.26, 12, config.mutedTextColor, 700))
  if (config.showZoneLabel) children.push(makeText(zone.label, 0, size * 0.42, 11, zone.color, 700))

  return children
}

function buildChildren(config: ZoneMetricResolvedConfig) {
  return config.displayMode === 'ring' ? buildRing(config) : buildRectangle(config)
}

function applyCustomProps(group: any, config: ZoneMetricResolvedConfig, displayStates?: any) {
  Object.assign(group, {
    eleType: 'zoneMetric',
    dataProperty: config.dataProperty,
    displayMode: config.displayMode,
    zonePreset: config.zonePreset,
    value: config.value,
    unit: config.unit,
    label: config.label,
    zoneLabel: resolveZone(config.value, config.zones).label,
    showLabel: config.showLabel,
    showValue: config.showValue,
    showUnit: config.showUnit,
    showZoneLabel: config.showZoneLabel,
    fill: config.fill,
    textColor: config.textColor,
    mutedTextColor: config.mutedTextColor,
    inactiveColor: config.inactiveColor,
    borderColor: config.borderColor,
    borderWidth: config.borderWidth,
    borderRadius: config.borderRadius,
    ringThickness: config.ringThickness,
    gap: config.gap,
    zones: config.zones,
    designWidth: config.width,
    designHeight: config.height,
    displayStates: normalizeDisplayStates(displayStates),
  })
}

export function createZoneMetric(options: ZoneMetricElementConfig): FabricElement {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()
  const canvas = canvasStore.canvas
  if (!canvas) throw new Error('Canvas not initialized, cannot add zone metric element')

  const config = normalizeConfig(options)
  const displayStates = normalizeDisplayStates(options.displayStates)
  const group = new Group(buildChildren(config), {
    id: config.id,
    left: config.left,
    top: config.top,
    width: config.width,
    height: config.height,
    originX: config.originX,
    originY: config.originY,
    selectable: true,
    hasControls: false,
    hasBorders: true,
    visible: getDisplayState(displayStates, layerStore.previewMode),
  } as any) as any

  applyCustomProps(group, config, displayStates)
  group.set({ width: config.width, height: config.height })

  canvas.add(group)
  layerStore.addLayer(group)
  canvas.setActiveObject(group)
  canvas.renderAll?.()

  elementDataStore.upsertElement(encodeZoneMetricGroup(group) as any)
  return group as FabricElement
}

export function updateZoneMetric(element: FabricElement, patch: Partial<ZoneMetricElementConfig> = {}): void {
  if (!element) return
  const canvas = useCanvasStore().canvas as any
  const obj = (canvas?.getObjects?.() || []).find((o: any) => String(o.id) === String((element as any).id)) || element
  const config = normalizeConfig({ ...(obj as any), ...patch }, String((obj as any).id))
  const displayStates = patch.displayStates ? normalizeDisplayStates(patch.displayStates) : normalizeDisplayStates((obj as any).displayStates)

  obj.set?.({
    left: config.left,
    top: config.top,
    originX: config.originX,
    originY: config.originY,
    visible: getDisplayState(displayStates, useLayerStore().previewMode),
  })
  applyCustomProps(obj, config, displayStates)

  const children = obj.getObjects?.() || []
  children.forEach((child: any) => {
    if (typeof obj.removeWithUpdate === 'function') obj.removeWithUpdate(child)
    else obj.remove?.(child)
  })
  buildChildren(config).forEach((child) => {
    if (typeof obj.addWithUpdate === 'function') obj.addWithUpdate(child)
    else obj.add?.(child)
  })

  obj.set?.({ width: config.width, height: config.height })
  obj._calcBounds?.()
  obj._updateObjectsCoords?.()
  obj._onAfterObjectsChange?.('add')
  obj.setCoords?.()
  canvas?.requestRenderAll?.()

  if ((obj as any).id != null) {
    useElementDataStore().patchElement(String((obj as any).id), encodeZoneMetricGroup(obj) as any)
  }
}

export function encodeZoneMetricGroup(element: any): ZoneMetricElementConfig {
  return {
    id: String(element.id || ''),
    eleType: 'zoneMetric',
    left: Math.round(Number(element.left || 0)),
    top: Math.round(Number(element.top || 0)),
    width: Number(element.designWidth ?? element.width ?? 168),
    height: Number(element.designHeight ?? element.height ?? 92),
    originX: element.originX || 'center',
    originY: element.originY || 'center',
    dataProperty: element.dataProperty || '',
    displayMode: element.displayMode || 'rectangle',
    zonePreset: element.zonePreset || 'heartRate',
    value: Number(element.value ?? 0),
    unit: String(element.unit ?? ''),
    label: String(element.label ?? ''),
    zoneLabel: String(element.zoneLabel ?? ''),
    showLabel: element.showLabel ?? true,
    showValue: element.showValue ?? true,
    showUnit: element.showUnit ?? true,
    showZoneLabel: element.showZoneLabel ?? true,
    fill: String(element.fill ?? ''),
    textColor: String(element.textColor ?? '#FFFFFF'),
    mutedTextColor: String(element.mutedTextColor ?? '#9CCFDA'),
    inactiveColor: String(element.inactiveColor ?? ''),
    borderColor: String(element.borderColor ?? ''),
    borderWidth: Number(element.borderWidth ?? 0),
    borderRadius: Number(element.borderRadius ?? 0),
    ringThickness: Number(element.ringThickness ?? 10),
    gap: Number(element.gap ?? 3),
    zones: Array.isArray(element.zones) ? element.zones : undefined,
    displayStates: normalizeDisplayStates(element.displayStates),
  }
}

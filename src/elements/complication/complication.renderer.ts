import { savedTextStyle } from '@/features/bitmap-font-maker/recipePreview'
import { ComplicationObject, installComplicationGuides } from './complication.canvas'
import { COMPLICATION_FIELDS, normalizeComplicationPresentation } from './complication.presentation'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { ComplicationElementConfig } from '@/types/elements/complication'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { usePropertiesStore } from '@/stores/properties'
import { resolveComplicationType } from './complication.catalog'
import { complicationSchema } from './complication.schema'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'
import { getSavedFontFamily, getSavedFontSize } from '@/utils/systemFontElement'
import { normalizeDisplayStates, getDisplayState } from '@/utils/displayStates'
import type { ElementUpdateContext } from '@/engine/registry/elementRegistry'

export { COMPLICATION_FIELDS } from './complication.presentation'
export function encodeComplication(element: FabricElement): ComplicationElementConfig {
  const result = {
    id: element.id!,
    eleType: 'complication',
    left: element.left,
    top: element.top,
    originX: element.originX,
    originY: element.originY,
    fill: savedTextStyle(element).fill,
    fillProperty: element.fillProperty,
    layerName: element.layerName,
    visibility: element.visibility,
    layoutVisibility: element.layoutVisibility,
    fontFamily: getSavedFontFamily(element),
    fontSize: getSavedFontSize(element, 36),
    displayStates: normalizeDisplayStates(element.displayStates),
    topBase: encodeTopBaseForElement(element),
    ...Object.fromEntries(COMPLICATION_FIELDS.map((key) => [key, element[key]]))
  } as ComplicationElementConfig
  resolveComplicationType(result, usePropertiesStore().allProperties)
  return result
}
export function refreshComplication(element: FabricElement): void {
  element.refreshPreview?.(usePropertiesStore().allProperties)
}
export function createComplication(config: ComplicationElementConfig): FabricElement {
  const normalized = { ...complicationSchema.defaultConfig, ...normalizeComplicationPresentation(config), ...config }
  const element = new ComplicationObject({
    ...normalized,
    objectCaching: false,
    assetFontFamily: normalized.fontFamily,
    id: config.id || nanoid(),
    eleType: 'complication',
    originX: config.originX ?? 'center',
    originY: config.originY ?? 'center',
    hasControls: false,
    hasBorders: true,
    displayStates: normalizeDisplayStates(config.displayStates),
    visible: getDisplayState(normalizeDisplayStates(config.displayStates), useLayerStore().previewMode)
  } as any) as FabricElement
  refreshComplication(element)
  const canvas = useCanvasStore().canvas
  if (canvas) installComplicationGuides(canvas as any)
  canvas?.add(element)
  refreshComplication(element)
  useLayerStore().addLayer(element as FabricElement & { eleType: string })
  useElementDataStore().upsertElement(encodeComplication(element))
  canvas?.setActiveObject(element)
  canvas?.requestRenderAll()
  return element
}
export function updateComplication(element: FabricElement, patch: Partial<ComplicationElementConfig>, context: ElementUpdateContext = {}): void {
  element.set(patch as any)
  if (patch.fontFamily !== undefined) element.assetFontFamily = patch.fontFamily
  refreshComplication(element)
  if (context.persist !== false) useElementDataStore().patchElement(element.id!, encodeComplication(element))
  useCanvasStore().canvas?.requestRenderAll()
}

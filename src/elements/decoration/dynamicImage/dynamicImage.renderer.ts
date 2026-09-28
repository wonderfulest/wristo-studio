import type { FabricElement } from '@/types/element'
import type { DynamicImageElementConfig } from '@/types/elements/dynamicImage'
import type { ElementRenderContext } from '@/engine/runtime/elementRenderContext'
import type { ElementUpdateContext } from '@/engine/registry/elementRegistry'
import { useExpressionPreviewStore } from '@/stores/expressionPreviewStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { createImage, updateImage } from '@/elements/decoration/image/image.renderer'
import { resolveDynamicImageSelection } from './dynamicImage.selection'
import { calculateDynamicImageStretch } from './dynamicImage.fit'
import { encodeDynamicImage } from './dynamicImage.encoder'

function applyFit(element: FabricElement) {
  const value = element as any
  const sourceWidth = Math.max(1, Number(value.width ?? 1))
  const sourceHeight = Math.max(1, Number(value.height ?? 1))
  const frameWidth = Math.max(1, Number(value.frameWidth ?? sourceWidth))
  const frameHeight = Math.max(1, Number(value.frameHeight ?? sourceHeight))
  const sizing = calculateDynamicImageStretch(sourceWidth, sourceHeight, frameWidth, frameHeight)
  value.set({ cropX: 0, cropY: 0, scaleX: sizing.scaleX, scaleY: sizing.scaleY })
}

const refreshQueues = new WeakMap<FabricElement, Promise<void>>()

export function refreshDynamicImage(element: FabricElement): Promise<void> {
  const previous = refreshQueues.get(element) ?? Promise.resolve()
  const pending = previous.catch(() => {}).then(() => applyDynamicImageSelection(element))
  refreshQueues.set(element, pending)
  return pending.finally(() => { if (refreshQueues.get(element) === pending) refreshQueues.delete(element) })
}

async function applyDynamicImageSelection(element: FabricElement): Promise<void> {
  const selection = resolveDynamicImageSelection({
    items: (element as any).items ?? [],
    selectionMode: (element as any).selectionMode,
    goalProperty: (element as any).goalProperty,
    progress: (element as any).progress,
    tokenValues: useExpressionPreviewStore().tokenValues,
  })
  const key = selection.kind === 'item' ? `item:${selection.index}:${selection.asset.imageUrl}` : selection.kind
  if ((element as any).__dynamicSelectionKey === key) return
  if (selection.kind === 'none') {
    await updateImage(element, { imageUrl: '', assetId: undefined }, { persist: false })
    ;(element as any).dynamicImageVisible = false
  } else {
    await updateImage(element, selection.asset, { persist: false })
    applyFit(element)
    ;(element as any).dynamicImageVisible = true
  }
  if (selection.kind === 'none' || (element as any).imageUrl === selection.asset.imageUrl) (element as any).__dynamicSelectionKey = key
  useCanvasStore().canvas?.requestRenderAll?.()
}

export async function createDynamicImage(config: DynamicImageElementConfig, renderContext?: ElementRenderContext) {
  const selection = resolveDynamicImageSelection({
    items: config.items ?? [],
    selectionMode: config.selectionMode,
    goalProperty: config.goalProperty,
    progress: config.progress,
    tokenValues: useExpressionPreviewStore().tokenValues,
  })
  const asset = selection.kind === 'none' ? {} : selection.asset
  const element = await createImage({ ...config, eleType: 'dynamicImage', ...asset }, renderContext)
  Object.assign(element as any, {
    eleType: 'dynamicImage', items: JSON.parse(JSON.stringify(config.items ?? [])),
    selectionMode: config.selectionMode,
    goalProperty: config.goalProperty, progress: config.progress ?? 0,
    frameWidth: config.width, frameHeight: config.height, dynamicImageVisible: selection.kind !== 'none',
    __dynamicSelectionKey: selection.kind === 'item' ? `item:${selection.index}:${selection.asset.imageUrl}` : selection.kind,
  })
  ;(element as any).off?.('modified')
  ;(element as any).on?.('modified', () => {
    ;(element as any).frameWidth = (element as any).getScaledWidth?.() ?? (element as any).frameWidth
    ;(element as any).frameHeight = (element as any).getScaledHeight?.() ?? (element as any).frameHeight
    useElementDataStore().upsertElement(encodeDynamicImage(element) as any)
  })
  if (selection.kind !== 'none') applyFit(element)
  useElementDataStore().upsertElement(config)
  return element
}

export async function updateDynamicImage(
  element: FabricElement,
  patch: Partial<DynamicImageElementConfig>,
  context: ElementUpdateContext = {},
) {
  if ('selectionMode' in patch) (element as any).selectionMode = patch.selectionMode
  if ('goalProperty' in patch) (element as any).goalProperty = patch.goalProperty
  if (patch.progress !== undefined) (element as any).progress = patch.progress
  if (patch.items !== undefined) (element as any).items = JSON.parse(JSON.stringify(patch.items))
  if (patch.width !== undefined) (element as any).frameWidth = patch.width
  if (patch.height !== undefined) (element as any).frameHeight = patch.height
  await updateImage(element, patch as any, { persist: false })
  await refreshDynamicImage(element)
  if (context.persist !== false) useElementDataStore().patchElement(String(element.id), encodeDynamicImage(element) as any)
}

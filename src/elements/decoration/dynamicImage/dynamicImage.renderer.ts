import type { FabricElement } from '@/types/element'
import type { DynamicImageElementConfig } from '@/types/elements/dynamicImage'
import type { ElementRenderContext } from '@/engine/runtime/elementRenderContext'
import type { ElementUpdateContext } from '@/engine/registry/elementRegistry'
import { useExpressionPreviewStore } from '@/stores/expressionPreviewStore'
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

export async function refreshDynamicImage(element: FabricElement): Promise<void> {
  const selection = resolveDynamicImageSelection({
    items: (element as any).items ?? [],
    tokenValues: useExpressionPreviewStore().tokenValues,
  })
  const key = selection.kind === 'item' ? `item:${selection.index}` : selection.kind
  if ((element as any).__dynamicSelectionKey === key) return
  ;(element as any).__dynamicSelectionKey = key
  if (selection.kind === 'none') {
    await updateImage(element, { imageUrl: '', assetId: undefined })
    ;(element as any).dynamicImageVisible = false
  } else {
    await updateImage(element, selection.asset)
    applyFit(element)
    ;(element as any).dynamicImageVisible = true
  }
}

export async function createDynamicImage(config: DynamicImageElementConfig, renderContext?: ElementRenderContext) {
  const selection = resolveDynamicImageSelection({
    items: config.items ?? [],
    tokenValues: useExpressionPreviewStore().tokenValues,
  })
  const asset = selection.kind === 'none' ? {} : selection.asset
  const element = await createImage({ ...config, eleType: 'dynamicImage', ...asset }, renderContext)
  Object.assign(element as any, {
    eleType: 'dynamicImage', items: structuredClone(config.items ?? []),
    frameWidth: config.width, frameHeight: config.height, dynamicImageVisible: selection.kind !== 'none',
    __dynamicSelectionKey: selection.kind === 'item' ? `item:${selection.index}` : selection.kind,
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
  _context: ElementUpdateContext = {},
) {
  if (patch.items !== undefined) (element as any).items = structuredClone(patch.items)
  if (patch.width !== undefined) (element as any).frameWidth = patch.width
  if (patch.height !== undefined) (element as any).frameHeight = patch.height
  await updateImage(element, patch as any)
  ;(element as any).__dynamicSelectionKey = undefined
  await refreshDynamicImage(element)
}

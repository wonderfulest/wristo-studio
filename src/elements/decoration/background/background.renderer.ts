import { Image as FabricImage, type ImageProps, type FabricObject, type TCrossOrigin } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { BackgroundElementConfig } from '@/types/elements/background'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import {
  DEFAULT_BACKGROUND_IMAGE_URL,
  isDefaultBackgroundUrl,
  resolveBackgroundUrl,
} from './background.constants'
import _ from 'lodash'

function getImageNaturalSize(img: HTMLImageElement): { width: number; height: number } {
  const w = Number((img as any).naturalWidth ?? img.width ?? 0)
  const h = Number((img as any).naturalHeight ?? img.height ?? 0)
  return { width: Math.max(1, w || 1), height: Math.max(1, h || 1) }
}

function createPlaceholderImageElement(): HTMLImageElement {
  const img = new Image()
  img.src = DEFAULT_BACKGROUND_IMAGE_URL
  return img
}

function setActiveBackgroundIfSelectable(canvas: any, bg: FabricImage): void {
  if (isDefaultBackgroundUrl((bg as any).wristoImageUrl)) {
    canvas.discardActiveObject?.()
    return
  }
  canvas.setActiveObject(bg as unknown as FabricObject)
}

async function setFabricImageSource(
  img: FabricImage,
  src: string,
  opts: { crossOrigin?: TCrossOrigin } = { crossOrigin: 'anonymous' },
): Promise<void> {
  const anyImg = img as any
  const fn = anyImg?.setSrc
  if (typeof fn !== 'function') {
    // fallback: create a temp image and swap element
    const tmp = await FabricImage.fromURL(src, { crossOrigin: (opts.crossOrigin ?? 'anonymous') as TCrossOrigin })
    const tmpEl = tmp.getElement?.() as HTMLImageElement | undefined
    if (tmpEl) {
      anyImg.setElement?.(tmpEl)
    }
    return
  }

  // Fabric 6: setSrc may return Promise; Fabric 5: callback signature.
  try {
    const ret = fn.call(anyImg, src, opts)
    if (ret && typeof ret.then === 'function') {
      await ret
      return
    }
  } catch {
    // ignore and fallback to callback style
  }

  await new Promise<void>((resolve, reject) => {
    try {
      fn.call(
        anyImg,
        src,
        () => resolve(),
        opts,
      )
    } catch (e) {
      reject(e)
    }
  })
}

function applyBackgroundLayout(imgObj: FabricImage, config: Partial<BackgroundElementConfig>): void {
  const canvasStore = useCanvasStore()
  const designSpec = (canvasStore.designStore?.designSpec || {}) as any
  const targetWidth = Number(designSpec.width ?? (designSpec.centerX != null ? designSpec.centerX * 2 : undefined) ?? 454)
  const targetHeight = Number(designSpec.height ?? (designSpec.centerY != null ? designSpec.centerY * 2 : undefined) ?? targetWidth)
  const targetSize = Math.min(targetWidth, targetHeight)
  const cx = Number(designSpec.centerX ?? targetWidth / 2)
  const cy = Number(designSpec.centerY ?? targetHeight / 2)

  const rawW = Number((imgObj as any).width ?? 1)
  const rawH = Number((imgObj as any).height ?? 1)
  const base = Math.min(rawW, rawH) || 1
  const scale = targetSize / base
  const isDefault = isDefaultBackgroundUrl((imgObj as any).wristoImageUrl ?? config.imageUrl)

  imgObj.set({
    left: cx,
    top: cy,
    originX: 'center',
    originY: 'center',
    scaleX: scale,
    scaleY: scale,
    selectable: !isDefault,
    evented: !isDefault,
    hasControls: false,
    hasBorders: !isDefault,
    locked: isDefault,
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    hoverCursor: isDefault ? 'default' : 'pointer',
  } as any)

  if (config.left != null) imgObj.set('left', Number(config.left) as never)
  if (config.top != null) imgObj.set('top', Number(config.top) as never)
}

function moveBackgroundToBottom(canvas: any, bg: any): void {
  const canvasStore = useCanvasStore()
  const watchFaceCircle = canvasStore.watchFaceCircle
  if (watchFaceCircle) {
    try {
      canvas.moveObjectTo(watchFaceCircle as any, 0)
    } catch {
      // ignore
    }
  }
  try {
    const idx = watchFaceCircle ? 1 : 0
    canvas.moveObjectTo(bg as any, idx)
  } catch {
    // ignore
  }
}

export async function createBackground(config: BackgroundElementConfig): Promise<FabricElement> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const canvas = canvasStore.canvas
  if (!canvas) throw new Error('Canvas not initialized')

  const existing = (canvas.getObjects?.() || []).find((o: any) => o && o.eleType === 'background') as
    | (FabricImage & FabricElement)
    | undefined
  if (existing) {
    applyBackgroundLayout(existing, {
      ...config,
      imageUrl: config.imageUrl ?? (existing as any).wristoImageUrl,
    })
    if (config.id != null && String(config.id) !== '' && String((existing as any).id ?? '') !== String(config.id)) {
      try {
        existing.set({ id: String(config.id) } as any)
      } catch {
        ;(existing as any).id = String(config.id)
      }
    }
    if (_.isEmpty(config.imageUrl) && (existing as any).wristoImageUrl) {
      setActiveBackgroundIfSelectable(canvas, existing)
      canvas.requestRenderAll?.()
      return existing as any
    }
    await updateBackground(existing as any, config)
    setActiveBackgroundIfSelectable(canvas, existing)
    canvas.requestRenderAll?.()
    return existing as any
  }

  const id = config.id || nanoid()
  const url = resolveBackgroundUrl(config.imageUrl)

  const img = url
    ? await FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
    : new FabricImage(createPlaceholderImageElement())

  const imgEl = img.getElement?.() as HTMLImageElement | undefined
  if (imgEl) {
    const natural = getImageNaturalSize(imgEl)
    img.set({ width: natural.width, height: natural.height } as any)
  }

  img.set({
    id,
    eleType: 'background',
    objectCaching: false,
  } as unknown as ImageProps)

  ;(img as any).wristoImageUrl = url
  ;(img as any).wristoImageId = config.imageId ?? null

  applyBackgroundLayout(img, config)

  canvas.add(img as unknown as FabricObject)
  moveBackgroundToBottom(canvas, img)

  if (canvasStore.watchFaceCircle) {
    canvas.set({ clipPath: canvasStore.watchFaceCircle as any })
  }
  layerStore.addLayer(img as any)
  setActiveBackgroundIfSelectable(canvas, img)
  canvas.requestRenderAll?.()
  return img as unknown as FabricElement
}

export async function updateBackground(
  element: FabricElement,
  patch: Partial<BackgroundElementConfig>,
): Promise<void> {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas) return

  const obj = (canvas.getObjects?.() || []).find((o: any) => {
    if (!o || o.eleType !== 'background') return false
    if (!(element as any).id) return true
    return String(o.id) === String((element as any).id)
  })
  const bg = (obj ?? (element as any)) as FabricImage & FabricElement
  if (!bg) return

  // keep runtime fabric object id consistent with config id
  if (patch.id != null && String(patch.id) !== '' && String((bg as any).id ?? '') !== String(patch.id)) {
    try {
      bg.set({ id: String(patch.id) } as any)
    } catch {
      ;(bg as any).id = String(patch.id)
    }
  }

  if (patch.left !== undefined) bg.set('left', Number(patch.left) as never)
  if (patch.top !== undefined) bg.set('top', Number(patch.top) as never)

  const nextUrlRaw = patch.imageUrl ?? (bg as any).wristoImageUrl
  const nextUrl = resolveBackgroundUrl(nextUrlRaw)

  const isExplicitClear = patch.imageUrl === '' || patch.imageUrl === null
  const shouldReload = Boolean(nextUrl && nextUrl !== (bg as any).wristoImageUrl)

  if (isExplicitClear) {
    try {
      await setFabricImageSource(bg, DEFAULT_BACKGROUND_IMAGE_URL, { crossOrigin: 'anonymous' })
    } catch (e) {
      console.warn('[Background] clear failed', e)
    }

    bg.set({ width: 100, height: 100, objectCaching: false } as any)
    ;(bg as any).wristoImageUrl = DEFAULT_BACKGROUND_IMAGE_URL
    ;(bg as any).wristoImageId = null
  } else if (shouldReload) {
    try {
      await setFabricImageSource(bg, nextUrl, { crossOrigin: 'anonymous' })

      const nextEl = bg.getElement?.() as HTMLImageElement | undefined
      const natural = nextEl
        ? getImageNaturalSize(nextEl)
        : { width: Number((bg as any).width ?? 1), height: Number((bg as any).height ?? 1) }

      bg.set({ width: natural.width, height: natural.height, objectCaching: false } as any)
      ;(bg as any).wristoImageUrl = nextUrl
    } catch (e) {
      console.warn('[Background] reload failed', e)
    }
  }

  if (patch.imageId !== undefined) {
    ;(bg as any).wristoImageId = patch.imageId
  }

  applyBackgroundLayout(bg, patch)
  moveBackgroundToBottom(canvas, bg)

  if (canvasStore.watchFaceCircle) {
    canvas.set({ clipPath: canvasStore.watchFaceCircle as any })
  }

  bg.setCoords?.()
  canvas.requestRenderAll?.()
}

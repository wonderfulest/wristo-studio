import { Image as FabricImage, type ImageProps, type FabricObject } from 'fabric'
import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { ImageElementConfig } from '@/types/elements/image'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import type { MinimalFabricLike } from '@/types/layer'
import { applyControlsToObject } from '@/utils/controlManager'
import { encodeImage } from './image.encoder'
import { analogAssetApi } from '@/api/wristo/analogAsset'

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    try {
      const u = new URL(url, window.location.href)
      if (u.origin !== window.location.origin) img.crossOrigin = 'anonymous'
    } catch {
      // ignore
    }
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = url
  })
}

function normalizeUrl(u: string): string {
  if (/^https?:\/\//.test(u) || u.startsWith('data:')) return u
  if (u.startsWith('@/')) return new URL(u, import.meta.url).href
  if (u.startsWith('/src/assets/')) return new URL(u.replace('/src/', '@/'), import.meta.url).href
  return u
}

async function resolveImageSource(input: {
  imageUrl?: string
  assetId?: number
}): Promise<{ imageUrl?: string }> {
  let imageUrl = input.imageUrl ? normalizeUrl(String(input.imageUrl)) : undefined

  if (input.assetId && !imageUrl) {
    try {
      const res = await analogAssetApi.get(input.assetId)
      const fileUrl = res.data?.file?.url
      const previewUrl = res.data?.file?.previewUrl
      imageUrl = normalizeUrl(String(previewUrl || fileUrl || '')) || undefined
    } catch (e) {
      console.warn('[Image] resolveImageSource failed', e)
    }
  }

  return { imageUrl }
}

function attachImageScaleSync(image: FabricImage): void {
  let committing = false

  image.on('modified', () => {
    if (committing) return
    const id = (image as any).id
    if (!id) return

    committing = true
    try {
      const store = useElementDataStore()
      const encoded = encodeImage(image as unknown as FabricElement)
      store.patchElement(String(id), encoded as any)
    } finally {
      committing = false
    }
  })
}

export async function createImage(config: ImageElementConfig): Promise<FabricElement> {
  const canvas = useCanvasStore().canvas
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()

  if (!canvas) throw new Error('Canvas not initialized')

  const id = config.id || nanoid()

  const resolved = await resolveImageSource({ imageUrl: config.imageUrl, assetId: config.assetId })
  const urlRaw = resolved.imageUrl || 'https://cdn.wristo.io/moonphase/h-phase-16.png'
  const imageUrl = normalizeUrl(String(urlRaw))

  const imgEl = await loadHtmlImage(imageUrl)
  const rawW = Math.max(1, Number((imgEl as any).naturalWidth ?? imgEl.width ?? 1))
  const rawH = Math.max(1, Number((imgEl as any).naturalHeight ?? imgEl.height ?? 1))

  const targetW = Math.max(1, Number(config.width ?? rawW))
  const targetH = Math.max(1, Number(config.height ?? rawH))

  const sx = targetW / rawW
  const sy = targetH / rawH

  const image = new FabricImage(imgEl, {
    id,
    eleType: 'image',
    designerControlMode: 'resize8',
    left: Number(config.left ?? 0),
    top: Number(config.top ?? 0),
    originX: (config.originX as any) ?? 'center',
    originY: (config.originY as any) ?? 'center',
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
    lockScalingX: false,
    lockScalingY: false,
    lockScalingFlip: true,
    objectCaching: false,
    // FabricImage：width/height 保持为源图自然尺寸，显示尺寸由 scaleX/scaleY 决定
    width: rawW,
    height: rawH,
    scaleX: sx,
    scaleY: sy,
  } as unknown as ImageProps) as unknown as FabricImage & FabricElement

  ;(image as any).imageUrl = imageUrl
  ;(image as any).assetId = config.assetId

  attachImageScaleSync(image)
  applyControlsToObject(image as unknown as FabricObject)

  canvas.add(image as unknown as FabricObject)
  layerStore.addLayer(image as unknown as MinimalFabricLike)
  canvas.setActiveObject(image as unknown as FabricObject)
  canvas.requestRenderAll?.()

  const encoded = encodeImage(image as unknown as FabricElement)
  elementDataStore.upsertElement(encoded as any)

  return image as unknown as FabricElement
}

export async function updateImage(element: FabricElement, patch: Partial<ImageElementConfig>): Promise<void> {
  const canvas = useCanvasStore().canvas
  const elementDataStore = useElementDataStore()
  if (!canvas) return

  const obj = (canvas.getObjects() as Array<FabricObject & FabricElement>).find((o) => (o as any).id === (element as any).id) as
    | (FabricImage & FabricElement)
    | undefined
  if (!obj) return

  if (patch.left !== undefined) obj.set('left', Number(patch.left) as never)
  if (patch.top !== undefined) obj.set('top', Number(patch.top) as never)

  const currentW = Number((obj as any).width ?? 0)
  const currentH = Number((obj as any).height ?? 0)

  const currentScaledW = obj.getScaledWidth?.() ?? currentW * Number((obj as any).scaleX ?? 1)
  const currentScaledH = obj.getScaledHeight?.() ?? currentH * Number((obj as any).scaleY ?? 1)

  const targetW = Math.max(1, Number(patch.width ?? (currentScaledW || 1)))
  const targetH = Math.max(1, Number(patch.height ?? (currentScaledH || 1)))

  const nextAssetId = patch.assetId ?? (obj as any).assetId
  const resolved = await resolveImageSource({
    imageUrl: patch.imageUrl ?? (obj as any).imageUrl,
    assetId: typeof nextAssetId === 'number' ? nextAssetId : undefined,
  })
  const nextUrl = resolved.imageUrl

  const shouldReload = Boolean(nextUrl && nextUrl !== (obj as any).imageUrl)

  if (shouldReload && nextUrl) {
    try {
      const imgEl = await loadHtmlImage(nextUrl)
      const rawW = Math.max(1, Number((imgEl as any).naturalWidth ?? imgEl.width ?? 1))
      const rawH = Math.max(1, Number((imgEl as any).naturalHeight ?? imgEl.height ?? 1))
      const sx = targetW / rawW
      const sy = targetH / rawH
      ;(obj as any).setElement?.(imgEl)
      obj.set({
        width: rawW,
        height: rawH,
        scaleX: sx,
        scaleY: sy,
      } as unknown as ImageProps)

      ;(obj as any).imageUrl = nextUrl
    } catch (e) {
      console.warn('[Image] reload failed', e)
    }
  } else if (patch.width !== undefined || patch.height !== undefined) {
    const rawW = Math.max(1, Number((obj as any).width ?? 1))
    const rawH = Math.max(1, Number((obj as any).height ?? 1))
    const sx = targetW / rawW
    const sy = targetH / rawH
    obj.set({ scaleX: sx, scaleY: sy } as unknown as ImageProps)
  }

  if (patch.assetId !== undefined) (obj as any).assetId = patch.assetId
  if (typeof nextAssetId === 'number') (obj as any).assetId = nextAssetId

  obj.setCoords?.()
  canvas.requestRenderAll?.()

  const id = (obj as any).id
  if (id != null) {
    const encoded = encodeImage(obj as unknown as FabricElement)
    elementDataStore.patchElement(String(id), encoded as any)
  }
}

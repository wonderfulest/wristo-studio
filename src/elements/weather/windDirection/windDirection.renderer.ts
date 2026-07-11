import { nanoid } from 'nanoid'
import { Image as FabricImage, type ImageProps, type FabricObject } from 'fabric'
import { useCanvasStore } from '@/stores/canvasStore'
import { analogAssetApi } from '@/api/wristo/analogAsset'
import type { FabricElement } from '@/types/element'
import type { WindDirectionElementConfig } from '@/types/elements/data'
import type { ElementRenderContext } from '@/engine/runtime/elementRenderContext'
import { assertElementRenderCurrent } from '@/engine/runtime/elementRenderContext'

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

function getImageNaturalSize(imgEl: HTMLImageElement): { width: number; height: number } {
  const w = Number((imgEl as unknown as { naturalWidth?: number }).naturalWidth ?? imgEl.width ?? 0)
  const h = Number((imgEl as unknown as { naturalHeight?: number }).naturalHeight ?? imgEl.height ?? 0)
  return {
    width: Math.max(1, w || 1),
    height: Math.max(1, h || 1),
  }
}

async function resolveWindSources(input: {
  imageUrl?: string
  imageSvg?: string
  assetId?: number
}): Promise<{ imageUrl?: string; imageSvg?: string }> {
  let imageUrl = input.imageUrl ? normalizeUrl(String(input.imageUrl)) : undefined
  let imageSvg = input.imageSvg ? normalizeUrl(String(input.imageSvg)) : undefined

  // assetId 可补齐 imageSvg 与 imageUrl（优先使用 previewUrl 的 PNG 用于展示）
  if (input.assetId && (!imageUrl || !imageSvg)) {
    try {
      const res = await analogAssetApi.get(input.assetId)
      const fileUrl = res.data?.file?.url
      const previewUrl = res.data?.file?.previewUrl

      if (!imageSvg && fileUrl) imageSvg = normalizeUrl(String(fileUrl))
      if (!imageUrl) imageUrl = normalizeUrl(String(previewUrl || fileUrl || '')) || undefined
    } catch (e) {
      console.warn('[WindDirection] resolveWindSources failed', e)
    }
  }

  return { imageUrl, imageSvg }
}

export type WindDirectionElement = FabricImage & {
  id: string
  eleType: 'windDirection'
  windDegree: number
  assetId?: number
  color?: string
  imageUrl?: string
  imageSvg?: string
}

export async function createWindDirection(
  config: WindDirectionElementConfig,
  renderContext?: ElementRenderContext,
): Promise<FabricElement> {
  assertElementRenderCurrent(renderContext)
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas) throw new Error('Canvas not ready')

  const id = config.id || nanoid()

  // 渲染使用 PNG（imageUrl），导出使用 SVG（imageSvg）。两者都保留。
  const { imageUrl, imageSvg } = await resolveWindSources({
    imageUrl: config.imageUrl,
    imageSvg: config.imageSvg,
    assetId: config.assetId,
  })
  assertElementRenderCurrent(renderContext)
  if (!imageUrl) throw new Error('WindDirection: no imageUrl source')

  const imgEl = await loadHtmlImage(imageUrl)
  assertElementRenderCurrent(renderContext)
  const natural = getImageNaturalSize(imgEl)
  const originalW = natural.width
  const originalH = natural.height

  const baseSize = Math.max(originalW, originalH) || 1
  const targetSize = (config.width ?? config.height ?? baseSize) || baseSize
  const scale = targetSize / baseSize

  const image = new FabricImage(imgEl, {
    left: config.left ?? 0,
    top: config.top ?? 0,
    originX: 'center',
    originY: 'center',
    angle: config.windDegree ?? 0,

    width: originalW,
    height: originalH,
    // ✅ 等比缩放：以最长边为基准缩放到 targetSize，scaleX/scaleY 相同
    scaleX: scale,
    scaleY: scale,

    objectCaching: false,
  } as ImageProps) as WindDirectionElement

  // ✅ 只挂“状态”
  image.id = id
  image.eleType = 'windDirection'
  image.windDegree = config.windDegree ?? 0
  image.assetId = config.assetId
  image.color = config.color
  image.imageUrl = imageUrl
  if (imageSvg) image.imageSvg = imageSvg

  assertElementRenderCurrent(renderContext)
  canvas.add(image as unknown as FabricObject)
  canvas.setActiveObject(image as unknown as FabricObject)
  canvas.renderAll()

  return image as unknown as FabricElement
}

export async function updateWindDirection(
  element: FabricElement,
  config: Partial<WindDirectionElementConfig>,
): Promise<void> {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas) return

  const obj = (canvas.getObjects() as Array<FabricObject & FabricElement>).find(
    (o) => (o as unknown as FabricElement).id === element.id,
  ) as WindDirectionElement | undefined
  if (!obj) return

  // 位置
  if (config.left !== undefined) obj.set('left', config.left as never)
  if (config.top !== undefined) obj.set('top', config.top as never)

  // 角度（只做旋转）
  if (config.windDegree !== undefined) {
    const clamped = ((config.windDegree % 360) + 360) % 360
    obj.set('angle', clamped as never)
    obj.windDegree = clamped
  }

  const prevW = Number((obj as unknown as { width?: number }).width ?? 0)
  const prevH = Number((obj as unknown as { height?: number }).height ?? 0)
  const prevScaleX = Number((obj as unknown as { scaleX?: number }).scaleX ?? 1)
  const prevScaleY = Number((obj as unknown as { scaleY?: number }).scaleY ?? 1)
  const prevTargetSize = Math.max(prevW * prevScaleX, prevH * prevScaleY) || 1

  const nextAssetId = config.assetId ?? obj.assetId
  const nextColor = config.color ?? obj.color

  const sources = await resolveWindSources({
    imageUrl: config.imageUrl ?? obj.imageUrl,
    imageSvg: config.imageSvg ?? obj.imageSvg,
    assetId: nextAssetId,
  })

  const nextImageUrl = sources.imageUrl
  const nextImageSvg = sources.imageSvg

  const shouldReloadImage = Boolean(nextImageUrl && nextImageUrl !== obj.imageUrl)

  if (shouldReloadImage && nextImageUrl) {
    try {
      const imgEl = await loadHtmlImage(nextImageUrl)
      const natural = getImageNaturalSize(imgEl)

      const baseSize = Math.max(natural.width, natural.height) || 1
      const targetSize = (config.width ?? config.height ?? prevTargetSize ?? baseSize) || baseSize
      const scale = targetSize / baseSize

      ;(obj as unknown as { setElement?: (el: HTMLImageElement) => void }).setElement?.(imgEl)
      obj.set({
        width: natural.width,
        height: natural.height,
        scaleX: scale,
        scaleY: scale,
      } as unknown as ImageProps)

      obj.imageUrl = nextImageUrl
    } catch (e) {
      console.warn('[WindDirection] updateWindDirection reload image failed', e)
    }
  } else if (config.width !== undefined || config.height !== undefined) {
    // 仅调整尺寸（不换图）
    const rawW = Number((obj as unknown as { width?: number }).width ?? 0)
    const rawH = Number((obj as unknown as { height?: number }).height ?? 0)
    const baseSize = Math.max(rawW, rawH) || 1
    const targetSize = (config.width ?? config.height ?? baseSize) || baseSize
    const scale = targetSize / baseSize
    obj.set({ scaleX: scale, scaleY: scale } as unknown as ImageProps)
  }

  // 更新状态（不影响展示效果，但用于导出）
  if (config.assetId !== undefined) obj.assetId = config.assetId
  if (config.color !== undefined) obj.color = config.color
  if (nextColor !== undefined) obj.color = nextColor
  if (nextImageUrl) obj.imageUrl = nextImageUrl
  if (nextImageSvg) obj.imageSvg = nextImageSvg

  obj.setCoords()
  canvas.setActiveObject(obj as unknown as FabricObject)
  canvas.renderAll()
}

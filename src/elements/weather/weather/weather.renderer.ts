import { nanoid } from 'nanoid'
import {
  Group as FabricGroup,
  type GroupProps,
  type FabricObject,
  Image as FabricImage,
  type ImageProps,
  Text as FabricText,
  type TextProps,
} from 'fabric'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import type { FabricElement } from '@/types/element'
import type { MinimalFabricLike } from '@/types/layer'
import type { WeatherElementConfig } from '@/types/elements/data'
import { applyControlsToObject } from '@/utils/controlManager'
import type { ElementRenderContext } from '@/engine/runtime/elementRenderContext'
import { assertElementRenderCurrent } from '@/engine/runtime/elementRenderContext'

function getDefaultWeatherImage(): string {
  return 'https://cdn.wristo.io/product/0ead49628f08435497e54594ad08b8f3/original.png'
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    try {
      const u = new URL(url, window.location.href)
      const sameOrigin = u.origin === window.location.origin
      if (!sameOrigin) img.crossOrigin = 'anonymous'
    } catch {}
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = url
  })
}

function normalizeUrl(u: string): string {
  if (/^https?:\/\//.test(u) || u.startsWith('data:')) return u
  if (u.startsWith('@/')) return new URL(u, import.meta.url).href
  if (u.startsWith('/src/assets/')) {
    const aliased = u.replace('/src/', '@/')
    return new URL(aliased, import.meta.url).href
  }
  return u
}

function unicodeToChar(unicode?: string | null): string {
  if (!unicode) return ''
  const raw = String(unicode).trim()
  const hex = raw.startsWith('0x') ? raw.slice(2) : raw.startsWith('\\u') ? raw.slice(2) : raw
  const code = parseInt(hex, 16)
  if (!Number.isFinite(code)) return ''
  try {
    return String.fromCodePoint(code)
  } catch {
    return ''
  }
}

type WeatherGroupLike = FabricGroup & {
  __weatherScaleSyncAttached?: boolean
  weatherDisplayType?: 'mip' | 'amoled'
  amoledImageUrl?: string
  amoledIconUnicode?: string
  mipUnicode?: string
  fontFamily?: string
  fill?: string
  fontSize?: number
  width?: number
  height?: number
  weatherImageUrl?: string
  amoledWidth?: number
  amoledHeight?: number
}

function attachManualScaleSync(group: FabricGroup): void {
  const g = group as unknown as WeatherGroupLike
  if (g.__weatherScaleSyncAttached) return
  g.__weatherScaleSyncAttached = true

  group.on('modified', () => {
    const dt = (g.weatherDisplayType ?? 'amoled') as 'mip' | 'amoled'
    if (dt !== 'amoled') return

    const sx = Number((group as any).scaleX ?? 1)
    const sy = Number((group as any).scaleY ?? 1)
    if (sx === 1 && sy === 1) return

    const baseW = Math.max(1, Number(g.amoledWidth ?? g.width ?? 1))
    const baseH = Math.max(1, Number(g.amoledHeight ?? g.height ?? 1))
    const nextW = Math.max(1, Math.round(baseW * sx))
    const nextH = Math.max(1, Math.round(baseH * sy))

    group.set({ scaleX: 1, scaleY: 1 } as any)

    const children = group.getObjects() as FabricObject[]
    const imageObj = children.find((c) => (c as any)?.role === 'image') as unknown as FabricImage | undefined
    if (imageObj) {
      const origW = (imageObj as any).width ?? 1
      const origH = (imageObj as any).height ?? 1
      imageObj.set({
        scaleX: nextW / Math.max(1, origW),
        scaleY: nextH / Math.max(1, origH),
      } as unknown as ImageProps)
      imageObj.setCoords?.()
      group.remove(imageObj as unknown as FabricObject)
      group.add(imageObj as unknown as FabricObject)
    }

    g.amoledWidth = nextW
    g.amoledHeight = nextH
    group.setCoords?.()
    group.canvas?.requestRenderAll?.()
  })
}

export async function createWeather(
  config: WeatherElementConfig,
  renderContext?: ElementRenderContext,
): Promise<FabricElement> {
  assertElementRenderCurrent(renderContext)
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const canvas = canvasStore.canvas
  if (!canvas) {
    throw new Error('Canvas is not initialized, cannot add weather element')
  }

  const id = config.id || nanoid()
  const canvasWidth = (canvas as any).width ?? (canvas as any).getWidth?.() ?? 0
  const canvasHeight = (canvas as any).height ?? (canvas as any).getHeight?.() ?? 0
  const cx = config.left ?? (canvasWidth ? canvasWidth / 2 : 0)
  const cy = config.top ?? (canvasHeight ? canvasHeight / 2 : 0)
  config.fill = config.fill || '#ffffff'

  const dt: 'mip' | 'amoled' =
    (config.weatherDisplayType as any) || (config.amoledImageUrl || config.imageUrl ? 'amoled' : 'mip')

  console.log('[WeatherRenderer] createWeather', {
    id,
    dt,
    cx,
    cy,
    config,
  })

  const addGroupToCanvas = (group: FabricGroup) => {
    assertElementRenderCurrent(renderContext)
    ;(group as unknown as { id?: string }).id = id
    ;(group as unknown as { eleType?: string }).eleType = 'weather'
    if (config.fontFamily) (group as unknown as { fontFamily?: string }).fontFamily = config.fontFamily
    if (config.fill) (group as unknown as { fill?: string }).fill = config.fill
    // 统一应用全局控制点样式（仅对 hasControls !== false 的 group 生效）
    applyControlsToObject(group as unknown as FabricObject)
    canvas.add(group as unknown as FabricObject)
    layerStore.addLayer(group as unknown as MinimalFabricLike)
    canvas.setActiveObject(group as unknown as FabricObject)
    canvas.renderAll()
    return group as unknown as FabricElement
  }

  let imgUrl = config.amoledImageUrl
    ? normalizeUrl(String(config.amoledImageUrl))
    : config.imageUrl
      ? normalizeUrl(String(config.imageUrl))
      : ''
  const imgW = config.width ?? 60
  const imgH = config.height ?? imgW
  const fontSize = config.fontSize ?? 36
  const fontFamily = config.fontFamily
  const fill = config.fill || '#ffffff'
  const mipChar = unicodeToChar(config.mipUnicode)
  if (dt === 'amoled' && !imgUrl) imgUrl = getDefaultWeatherImage()

  return await new Promise<FabricElement>((resolve, reject) => {
    const createEmptyGroup = () => {
      const group = new FabricGroup([], {
        left: cx,
        top: cy,
        originX: 'center',
        originY: 'center',
        selectable: true,
        hasControls: dt === 'amoled',
        hasBorders: true,
        lockRotation: true,
        lockScalingX: false,
        lockScalingY: false,
        objectCaching: false,
      } as GroupProps)
      const g = group as unknown as WeatherGroupLike
      g.weatherDisplayType = dt
      g.amoledImageUrl = imgUrl
      g.amoledIconUnicode = config.amoledIconUnicode
      g.weatherImageUrl = imgUrl
      g.mipUnicode = config.mipUnicode
      g.fontFamily = fontFamily
      g.fill = fill
      g.fontSize = fontSize
      g.width = imgW
      g.height = imgH
      g.amoledWidth = imgW
      g.amoledHeight = imgH

      if (dt === 'amoled') attachManualScaleSync(group)
      const el = addGroupToCanvas(group)
      resolve(el)
    }

    if (dt === 'mip') {
      const glyph = mipChar || '?'
      const text = new FabricText(glyph, {
        originX: 'center',
        originY: 'center',
        left: 0,
        top: 0,
        fill,
        fontFamily,
        fontSize,
        objectCaching: false,
        selectable: false,
        hasControls: false,
        hasBorders: false,
      } as TextProps)
      ;(text as any).role = 'glyph'

      const group = new FabricGroup([text as unknown as FabricObject], {
        left: cx,
        top: cy,
        originX: 'center',
        originY: 'center',
        selectable: true,
        hasControls: false,
        hasBorders: true,
        lockRotation: true,
        objectCaching: false,
        visible: true,
      } as GroupProps)

      const g = group as unknown as WeatherGroupLike
      g.weatherDisplayType = 'mip'
      g.mipUnicode = config.mipUnicode
      g.fontFamily = fontFamily
      g.fill = fill
      g.fontSize = fontSize
      // 注意：这里不再用字形包围盒覆盖 g.width/g.height，
      // 让 width/height 继续表示 AMOLED 的逻辑尺寸（默认 imgW/imgH 或之前的缩放结果），
      // 避免从 MIP 切到 AMOLED 时受 fontSize 影响。

      const el = addGroupToCanvas(group)
      resolve(el)
      return
    }

    if (!imgUrl) {
      createEmptyGroup()
      return
    }

    let resolved = false
    setTimeout(() => { if (!resolved) console.warn('[WeatherRenderer] createWeather image load not resolved yet', { imgUrl }) }, 2000)

    loadHtmlImage(imgUrl)
      .then((imgEl) => {
        resolved = true
        const image = new FabricImage(imgEl as HTMLImageElement, {
          originX: 'center',
          originY: 'center',
          left: 0,
          top: 0,
          objectCaching: false,
          visible: true,
          opacity: 1,
        } as ImageProps)
        image.scaleToWidth(imgW)
        image.scaleToHeight(imgH)
        const iw = (image as unknown as { width?: number }).width ?? 1
        const ih = (image as unknown as { height?: number }).height ?? 1
        const sw = image.getScaledWidth?.() ?? 0
        const sh = image.getScaledHeight?.() ?? 0
        if (sw === 0 || sh === 0) {
          const sx = Math.max(1, imgW) / Math.max(1, iw)
          const sy = Math.max(1, imgH) / Math.max(1, ih)
          image.set({ scaleX: sx, scaleY: sy } as unknown as ImageProps)
        }
        ;(image as unknown as { role?: string }).role = 'image'
        const group = new FabricGroup([image as unknown as FabricObject], {
          left: cx,
          top: cy,
          originX: 'center',
          originY: 'center',
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockRotation: true,
          lockScalingX: false,
          lockScalingY: false,
          objectCaching: false,
          visible: true,
        } as GroupProps)
        const g = group as unknown as WeatherGroupLike
        g.weatherDisplayType = 'amoled'
        g.amoledImageUrl = imgUrl
        g.amoledIconUnicode = config.amoledIconUnicode
        g.weatherImageUrl = imgUrl
        g.fontFamily = fontFamily
        g.fill = fill
        g.fontSize = fontSize
        g.width = imgW
        g.height = imgH
        g.amoledWidth = imgW
        g.amoledHeight = imgH

        attachManualScaleSync(group)
        const el = addGroupToCanvas(group)
        resolve(el)
      })
      .catch((err) => {
        try {
          assertElementRenderCurrent(renderContext)
          console.error('[WeatherRenderer] createWeather image load error, creating empty group', { imgUrl, err })
          createEmptyGroup()
        } catch (error) {
          reject(error)
        }
      })
  })
}

export function updateWeather(element: FabricElement, config: Partial<WeatherElementConfig>) {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas) return

  const obj = (canvas.getObjects() as Array<FabricObject & FabricElement>).find((o) => (o as unknown as FabricElement).id === element.id) as FabricGroup | undefined
  if (!obj) return

  const g = obj as unknown as WeatherGroupLike

  const nextDisplayType: 'mip' | 'amoled' =
    (config.weatherDisplayType as any) || (g.weatherDisplayType as any) || 'amoled'

  const shouldLockPosition = (config.left === undefined && config.top === undefined)
  const prevPos = shouldLockPosition ? { left: (obj as any).left, top: (obj as any).top } : null
  if (config.left !== undefined) obj.set('left', config.left as never)
  if (config.top !== undefined) obj.set('top', config.top as never)

  if (config.fontFamily !== undefined) g.fontFamily = config.fontFamily
  if (config.fill !== undefined) g.fill = config.fill
  if (config.fontSize !== undefined) g.fontSize = Number(config.fontSize)
  if (config.mipUnicode !== undefined) g.mipUnicode = String(config.mipUnicode)
  if ((config as any).amoledIconUnicode !== undefined) g.amoledIconUnicode = String((config as any).amoledIconUnicode)

  const incomingAmoledUrl = config.amoledImageUrl ?? config.imageUrl
  if (incomingAmoledUrl !== undefined) {
    g.amoledImageUrl = String(incomingAmoledUrl)
    g.weatherImageUrl = String(incomingAmoledUrl)
  }

  g.weatherDisplayType = nextDisplayType

  const children = obj.getObjects() as FabricObject[]
  const imageObj = children.find((c) => (c as any)?.role === 'image') as unknown as FabricImage | undefined
  const glyphObj = children.find((c) => (c as any)?.role === 'glyph') as unknown as FabricText | undefined

  const ensureAmoledImage = (url: string | undefined) => {
    const resolved = url ? normalizeUrl(String(url)) : undefined
    const finalUrl = resolved || getDefaultWeatherImage()
    const incomingW = (config as any).width
    const incomingH = (config as any).height
    const baseW = incomingW != null ? Number(incomingW) : Number(g.amoledWidth ?? 60)
    const baseH = incomingH != null ? Number(incomingH) : Number(g.amoledHeight ?? baseW)
    const targetW = Math.max(1, baseW)
    const targetH = Math.max(1, baseH)

    const applySize = (img: FabricImage) => {
      const origW = (img as any).width ?? 1
      const origH = (img as any).height ?? 1
      // AMOLED 图标始终保持正方形：取目标宽高中的较大值作为统一边长
      const side = Math.max(targetW, targetH)
      img.set({
        scaleX: side / Math.max(1, origW),
        scaleY: side / Math.max(1, origH),
      } as unknown as ImageProps)
      ;(img as any).role = 'image'
      g.amoledWidth = side
      g.amoledHeight = side
      g.width = side
      g.height = side
    }

    if (!imageObj) {
      loadHtmlImage(finalUrl)
        .then((imgEl) => {
          const img = new FabricImage(imgEl as HTMLImageElement, {
            originX: 'center',
            originY: 'center',
            left: (prevPos as any)?.left ?? 0,
            top: (prevPos as any)?.top ?? 0,
            objectCaching: false,
            visible: true,
            opacity: 1,
          } as ImageProps)
          applySize(img)
          children.forEach((ch) => obj.remove(ch))
          obj.add(img as unknown as FabricObject)
          obj.set({ hasControls: true, hasBorders: true, lockRotation: true } as unknown as GroupProps)
          attachManualScaleSync(obj)
          applyControlsToObject(obj)
          obj.setCoords()
          canvas.requestRenderAll()
        })
        .catch((err) => console.error('[WeatherRenderer] ensureAmoledImage load error', { finalUrl, err }))
      return
    }

    // has image already
    if (finalUrl) {
      loadHtmlImage(finalUrl)
        .then((imgEl) => {
          try { (imageObj as any).setElement?.(imgEl as HTMLImageElement) } catch {}
          applySize(imageObj)
          imageObj.setCoords?.()
          obj.remove(imageObj as unknown as FabricObject)
          obj.add(imageObj as unknown as FabricObject)
          obj.set({ hasControls: true, hasBorders: true, lockRotation: true } as unknown as GroupProps)
          attachManualScaleSync(obj)
          applyControlsToObject(obj)
          obj.setCoords()
          canvas.requestRenderAll()
        })
        .catch(() => {
          // even if image reload fails, still apply size
          applySize(imageObj)
          canvas.requestRenderAll()
        })
    }
  }

  const ensureMipGlyph = () => {
    const glyph = unicodeToChar(g.mipUnicode) || '?'
    const fontFamily = g.fontFamily
    const fill = g.fill || '#ffffff'
    const fontSize = g.fontSize ?? 36

    if (!glyphObj) {
      const text = new FabricText(glyph, {
        originX: 'center',
        originY: 'center',
        left: obj.left ?? 0,
        top: obj.top ?? 0,
        fill,
        fontFamily,
        fontSize,
        objectCaching: false,
        selectable: false,
        hasControls: false,
        hasBorders: false,
      } as TextProps)
      ;(text as any).role = 'glyph'
      children.forEach((ch) => obj.remove(ch))
      obj.add(text as unknown as FabricObject)
      obj.set({ hasControls: false, hasBorders: true, lockRotation: true } as unknown as GroupProps)
      obj.setCoords()
      canvas.requestRenderAll()
      return
    }

    glyphObj.set({ text: glyph, fontFamily, fill, fontSize } as any)
    glyphObj.setCoords?.()
    obj.remove(glyphObj as unknown as FabricObject)
    obj.add(glyphObj as unknown as FabricObject)
    obj.set({ hasControls: false, hasBorders: true, lockRotation: true } as unknown as GroupProps)
    obj.setCoords()
    canvas.requestRenderAll()
  }

  if (nextDisplayType === 'mip') {
    ensureMipGlyph()
  } else {
    ensureAmoledImage(g.amoledImageUrl)
  }

  canvas.renderAll()
  return
}

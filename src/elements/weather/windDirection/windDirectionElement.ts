import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import { Group as FabricGroup, type GroupProps, type FabricObject, Image as FabricImage, type ImageProps } from 'fabric'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { useAnalogAssetStore } from '@/stores/analogAssetStore'
import { analogAssetApi } from '@/api/wristo/analogAsset'
import type { FabricElement } from '@/types/element'
import type { MinimalFabricLike } from '@/types/layer'
import type { WindDirectionElementConfig } from '@/types/elements/data'

async function applySvgColor(url: string, color?: string): Promise<string> {
  if (!/\.svg([?#].*)?$/i.test(url) && !url.includes('data:image/svg')) return url
  if (!color) return url
  
  try {
    const response = await fetch(url)
    let svgText = await response.text()

    const shouldKeepOriginalFill = (value: string): boolean => {
      const v = value.trim().toLowerCase()
      return v === 'none' || v.startsWith('url(')
    }

    svgText = svgText.replace(/fill="([^"]+)"/gi, (_m, v: string) => {
      return shouldKeepOriginalFill(v) ? `fill="${v}"` : `fill="${color}"`
    })
    svgText = svgText.replace(/fill='([^']+)'/gi, (_m, v: string) => {
      return shouldKeepOriginalFill(v) ? `fill='${v}'` : `fill='${color}'`
    })
    svgText = svgText.replace(/fill\s*:\s*([^;\s}]+)/gi, (_m, v: string) => {
      return shouldKeepOriginalFill(v) ? `fill:${v}` : `fill:${color}`
    })
    
    return 'data:image/svg+xml,' + encodeURIComponent(svgText)
  } catch (e) {
    console.warn('Failed to apply SVG color:', e)
    return url
  }
}

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

function parseSvgSizeFromText(svgText: string): { width: number, height: number } | null {
  const viewBoxMatch = svgText.match(/viewBox\s*=\s*["']([^"']+)["']/i)
  if (viewBoxMatch?.[1]) {
    const nums = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number)
    if (nums.length >= 4 && Number.isFinite(nums[2]) && Number.isFinite(nums[3]) && nums[2] > 0 && nums[3] > 0) {
      return { width: nums[2], height: nums[3] }
    }
  }

  const widthMatch = svgText.match(/\bwidth\s*=\s*["']([^"']+)["']/i)
  const heightMatch = svgText.match(/\bheight\s*=\s*["']([^"']+)["']/i)
  if (widthMatch?.[1] && heightMatch?.[1]) {
    const w = parseFloat(widthMatch[1])
    const h = parseFloat(heightMatch[1])
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      return { width: w, height: h }
    }
  }

  return null
}

function decodeSvgFromDataUrl(url: string): string | null {
  if (!url.startsWith('data:image/svg+xml')) return null
  const commaIndex = url.indexOf(',')
  if (commaIndex < 0) return null
  const meta = url.slice(0, commaIndex)
  const data = url.slice(commaIndex + 1)
  try {
    if (/;base64/i.test(meta)) return atob(data)
    return decodeURIComponent(data)
  } catch {
    return null
  }
}

async function resolveSourceSize(url: string, fallbackWidth: number, fallbackHeight: number): Promise<{ width: number, height: number }> {
  const fallback = { width: Math.max(1, fallbackWidth), height: Math.max(1, fallbackHeight) }

  const svgTextFromData = decodeSvgFromDataUrl(url)
  if (svgTextFromData) {
    const parsed = parseSvgSizeFromText(svgTextFromData)
    const result = parsed ?? fallback
    console.info('[WindDirection][resolveSourceSize:data-url]', {
      parsed,
      fallback,
      result,
    })
    return result
  }

  if (!/\.svg([?#].*)?$/i.test(url)) {
    console.info('[WindDirection][resolveSourceSize:non-svg-fallback]', {
      url,
      fallback,
    })
    return fallback
  }

  try {
    const response = await fetch(url)
    const svgText = await response.text()
    const parsed = parseSvgSizeFromText(svgText)
    const result = parsed ?? fallback
    console.info('[WindDirection][resolveSourceSize:remote-svg]', {
      url,
      parsed,
      fallback,
      result,
    })
    return result
  } catch (err) {
    console.warn('[WindDirection][resolveSourceSize:fetch-failed]', {
      url,
      fallback,
      err,
    })
    return fallback
  }
}

function getProportionalSize(
  originalWidth: number,
  originalHeight: number,
  requestedWidth?: number,
  requestedHeight?: number,
  fallbackMax = 60,
): { width: number, height: number, scale: number } {
  const ow = Math.max(1, Number(originalWidth) || 1)
  const oh = Math.max(1, Number(originalHeight) || 1)
  const rw = requestedWidth != null ? Math.max(1, Number(requestedWidth)) : undefined
  const rh = requestedHeight != null ? Math.max(1, Number(requestedHeight)) : undefined

  let scale: number
  if (rw != null && rh != null) {
    scale = Math.min(rw / ow, rh / oh)
  } else if (rw != null) {
    scale = rw / ow
  } else if (rh != null) {
    scale = rh / oh
  } else {
    scale = Math.max(1, fallbackMax) / Math.max(ow, oh)
  }

  const width = Math.max(1, ow * scale)
  const height = Math.max(1, oh * scale)

  return { width, height, scale }
}

type WindDirectionGroupLike = FabricGroup & {
  windWidth?: number
  windHeight?: number
  windSourceWidth?: number
  windSourceHeight?: number
  __windScaleSyncAttached?: boolean
}

function commitManualGroupScale(group: FabricGroup): void {
  const g = group as unknown as WindDirectionGroupLike
  const groupScaleX = Number(group.scaleX ?? 1)
  const groupScaleY = Number(group.scaleY ?? 1)
  if (!Number.isFinite(groupScaleX) || !Number.isFinite(groupScaleY)) return
  if (Math.abs(groupScaleX - 1) < 0.0001 && Math.abs(groupScaleY - 1) < 0.0001) return

  // 此处不再主动修改 group/image 的 scale，只记录当前缩放后的可视尺寸，
  // 让最终视觉状态完全由 Fabric 自身的缩放结果决定
  const imageObj = group
    .getObjects()
    .find((c) => (c as unknown as { role?: string }).role === 'image') as unknown as FabricImage | undefined

  const nextW = Math.max(1, Number((group as unknown as { getScaledWidth?: () => number }).getScaledWidth?.() ?? group.width ?? 1))
  const nextH = Math.max(1, Number((group as unknown as { getScaledHeight?: () => number }).getScaledHeight?.() ?? group.height ?? 1))

  g.windWidth = nextW
  g.windHeight = nextH

  if (imageObj) {
    const sourceW = Math.max(1, Number((imageObj as unknown as { width?: number }).width ?? nextW))
    const sourceH = Math.max(1, Number((imageObj as unknown as { height?: number }).height ?? nextH))
    g.windSourceWidth = sourceW
    g.windSourceHeight = sourceH
  }

  group.setCoords()
  group.canvas?.requestRenderAll()
}

function attachManualScaleSync(group: FabricGroup): void {
  const g = group as unknown as WindDirectionGroupLike
  if (g.__windScaleSyncAttached) return
  g.__windScaleSyncAttached = true
  // 仅在缩放结束（modified）时将 group 的缩放吸收到内部 image，
  // 避免在 scaling 过程中立刻重置 scale 导致控制点视觉上不动
  group.on('modified', () => {
    commitManualGroupScale(group)
  })
}

export const useWindDirectionStore = defineStore('windDirectionElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return { baseStore, layerStore }
  },

  actions: {
    async addElement(config: WindDirectionElementConfig): Promise<FabricElement> {
      const id = config.id || nanoid()
      const cx = config.left ?? 0
      const cy = config.top ?? 0
      const windDeg = config.windDegree ?? 0
      const rawImageUrl = config.imageUrl ? String(config.imageUrl) : undefined
      let imageUrl = rawImageUrl ? normalizeUrl(rawImageUrl) : undefined
      let resolvedAssetId = config.assetId

      if (!imageUrl && resolvedAssetId) {
        try {
          const res = await analogAssetApi.get(resolvedAssetId)
          imageUrl = res.data?.file?.previewUrl || res.data?.file?.url || undefined
          if (imageUrl) imageUrl = normalizeUrl(String(imageUrl))
        } catch {
          console.warn('[WindDirection] asset load failed by id:', resolvedAssetId)
        }
      }

      if (!imageUrl) {
        const analogAssetStore = useAnalogAssetStore()
        await analogAssetStore.loadAssets('windDirection')
        imageUrl = analogAssetStore.getFirstUrl('windDirection') ?? undefined
        resolvedAssetId = analogAssetStore.getFirstId('windDirection') ?? resolvedAssetId
        if (imageUrl) imageUrl = normalizeUrl(String(imageUrl))
      }

      if (imageUrl) {
        imageUrl = await applySvgColor(imageUrl, config.color)
      }

      const canvas = this.baseStore.canvas
      if (!canvas) throw new Error('Canvas not ready')

      const groupBaseOptions = {
        left: cx,
        top: cy,
        angle: windDeg,
        originX: 'center',
        originY: 'center',
        selectable: true,
        hasControls: true,
        hasBorders: true,
        objectCaching: false,
      } as GroupProps

      const addGroupToCanvas = (group: FabricGroup): FabricElement => {
        ;(group as unknown as { id?: string }).id = id
        ;(group as unknown as { eleType?: string }).eleType = 'windDirection'
        ;(group as unknown as { windDegree?: number }).windDegree = windDeg
        ;(group as unknown as { color?: string }).color = config.color
        ;(group as unknown as { assetId?: number }).assetId = resolvedAssetId
        group.set({
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
          lockScalingX: false,
          lockScalingY: false,
          lockRotation: true,
          objectCaching: false,
        } as unknown as GroupProps)
        attachManualScaleSync(group)
        canvas.add(group as unknown as FabricObject)
        this.layerStore.addLayer(group as unknown as MinimalFabricLike)
        canvas.setActiveObject(group as unknown as FabricObject)
        canvas.renderAll()
        return group as unknown as FabricElement
      }

      const createEmptyGroup = async (): Promise<FabricElement> => {
        let sourceWidth = 60
        let sourceHeight = 60
        if (imageUrl) {
          const sourceSize = await resolveSourceSize(imageUrl, 60, 60)
          sourceWidth = sourceSize.width
          sourceHeight = sourceSize.height
        }

        const { width: renderW, height: renderH } = getProportionalSize(
          sourceWidth,
          sourceHeight,
          config.width,
          config.height,
          60,
        )
        const group = new FabricGroup([], groupBaseOptions)
        if (imageUrl) (group as unknown as { windImageUrl?: string }).windImageUrl = imageUrl
        ;(group as unknown as { windWidth?: number }).windWidth = renderW
        ;(group as unknown as { windHeight?: number }).windHeight = renderH
        ;(group as unknown as { windSourceWidth?: number }).windSourceWidth = Math.max(1, sourceWidth)
        ;(group as unknown as { windSourceHeight?: number }).windSourceHeight = Math.max(1, sourceHeight)
        return addGroupToCanvas(group)
      }
      if (!imageUrl) {
        return await createEmptyGroup()
      }

      try {
        const imgEl = await loadHtmlImage(imageUrl)
        const sourceSize = await resolveSourceSize(
          imageUrl,
          imgEl.naturalWidth || 1,
          imgEl.naturalHeight || 1,
        )
        const { width, height, scale } = getProportionalSize(
          sourceSize.width,
          sourceSize.height,
          config.width,
          config.height,
          60,
        )

        const image = new FabricImage(imgEl, {
          originX: 'center',
          originY: 'center',
          left: 0,
          top: 0,
          scaleX: scale,
          scaleY: scale,
          objectCaching: false,
          visible: true,
          opacity: 1,
        } as ImageProps)
        ;(image as unknown as { role?: string }).role = 'image'

        const group = new FabricGroup([image as unknown as FabricObject], {
          ...groupBaseOptions,
          visible: true,
        } as GroupProps)
        ;(group as unknown as { windImageUrl?: string }).windImageUrl = imageUrl
        ;(group as unknown as { windWidth?: number }).windWidth = width
        ;(group as unknown as { windHeight?: number }).windHeight = height
        ;(group as unknown as { windSourceWidth?: number }).windSourceWidth = sourceSize.width
        ;(group as unknown as { windSourceHeight?: number }).windSourceHeight = sourceSize.height

        return addGroupToCanvas(group)
      } catch (err) {
        console.warn('[WindDirection] addElement load image failed, fallback to empty group', err)
        return await createEmptyGroup()
      }
    },

    async updateElement(element: FabricElement, config: Partial<WindDirectionElementConfig>) {
      const canvas = this.baseStore.canvas
      if (!canvas) return
      const obj = (canvas.getObjects() as Array<FabricObject & FabricElement>)
        .find((o) => (o as unknown as FabricElement).id === element.id) as FabricGroup | undefined
      if (!obj) return
      obj.set({
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockScalingX: false,
        lockScalingY: false,
      } as unknown as GroupProps)
      attachManualScaleSync(obj)

      const shouldLockPosition = config.left === undefined && config.top === undefined
      const prevPos = shouldLockPosition ? { left: (obj as any).left, top: (obj as any).top } : null

      if (config.left !== undefined) obj.set('left', config.left as never)
      if (config.top !== undefined) obj.set('top', config.top as never)

      const children = obj.getObjects() as FabricObject[]
      let imageObj = children.find((c) => (c as unknown as { role?: string }).role === 'image') as unknown as FabricImage | undefined

      const storedUrl = (obj as unknown as { windImageUrl?: string }).windImageUrl
      const currentUrlRaw = config.imageUrl ?? storedUrl
      let nextUrl = currentUrlRaw ? normalizeUrl(String(currentUrlRaw)) : undefined
      const currentAssetId = (obj as unknown as { assetId?: number }).assetId
      const isAssetChanged = config.assetId !== undefined && config.assetId !== currentAssetId
      const nextAssetId = config.assetId ?? currentAssetId

      const isSvgLikeUrl = (url?: string): boolean => {
        if (!url) return false
        return /\.svg([?#].*)?$/i.test(url) || url.startsWith('data:image/svg+xml')
      }

      if (nextAssetId && (isAssetChanged || !isSvgLikeUrl(nextUrl))) {
        try {
          const assetRes = await analogAssetApi.get(nextAssetId)
          const sourceUrl = assetRes.data?.file?.previewUrl || assetRes.data?.file?.url
          if (sourceUrl) nextUrl = normalizeUrl(String(sourceUrl))
        } catch (err) {
          console.warn('[WindDirectionStore] updateElement resolve source url by assetId failed', nextAssetId, err)
        }
      }
      
      const currentColor = (obj as unknown as { color?: string }).color
      const nextColor = config.color ?? currentColor
      
      if (nextUrl && (nextUrl !== storedUrl || config.color !== undefined)) {
        nextUrl = await applySvgColor(nextUrl, nextColor)
      }

      const currentStoredW = (obj as unknown as { windWidth?: number }).windWidth ?? (obj as unknown as { width?: number }).width
      const currentStoredH = (obj as unknown as { windHeight?: number }).windHeight ?? (obj as unknown as { height?: number }).height
      const hasExplicitSize = config.width !== undefined || config.height !== undefined

      const applyImageToGroup = (imgObj: FabricImage, sourceWidth?: number, sourceHeight?: number) => {
        const fallbackSourceW = (obj as unknown as { windSourceWidth?: number }).windSourceWidth
        const fallbackSourceH = (obj as unknown as { windSourceHeight?: number }).windSourceHeight
        const iw = Math.max(1, Number(sourceWidth ?? fallbackSourceW ?? (imgObj as unknown as { width?: number }).width ?? 1))
        const ih = Math.max(1, Number(sourceHeight ?? fallbackSourceH ?? (imgObj as unknown as { height?: number }).height ?? 1))
        
        let renderW: number
        let renderH: number
        let scale: number
        
        if (hasExplicitSize) {
          const requestedW = config.width !== undefined ? Number(config.width) : undefined
          const requestedH = config.height !== undefined ? Number(config.height) : undefined
          const result = getProportionalSize(iw, ih, requestedW, requestedH, 60)
          renderW = result.width
          renderH = result.height
          scale = result.scale
        } else if (currentStoredW != null && currentStoredH != null) {
          renderW = Number(currentStoredW)
          renderH = Number(currentStoredH)
          scale = Math.min(renderW / iw, renderH / ih)
        } else {
          const result = getProportionalSize(iw, ih, undefined, undefined, 60)
          renderW = result.width
          renderH = result.height
          scale = result.scale
        }
        
        imgObj.set({ scaleX: scale, scaleY: scale } as unknown as ImageProps)
        ;(imgObj as unknown as { role?: string }).role = 'image'
        ;(obj as unknown as { windWidth?: number }).windWidth = renderW
        ;(obj as unknown as { windHeight?: number }).windHeight = renderH
        ;(obj as unknown as { windSourceWidth?: number }).windSourceWidth = iw
        ;(obj as unknown as { windSourceHeight?: number }).windSourceHeight = ih
        if (nextUrl) (obj as unknown as { windImageUrl?: string }).windImageUrl = String(nextUrl)
        ;(obj as unknown as { assetId?: number }).assetId = nextAssetId
        if (nextColor !== undefined) (obj as unknown as { color?: string }).color = nextColor
        obj.remove(imgObj as unknown as FabricObject)
        obj.add(imgObj as unknown as FabricObject)
        obj.set({ visible: true } as unknown as GroupProps)
        obj.setCoords()
      }

      const shouldReloadImage = Boolean(nextUrl && (
        nextUrl !== storedUrl
        || config.color !== undefined
        || !imageObj
      ))

      if (shouldReloadImage && nextUrl) {
        try {
          const imgEl = await loadHtmlImage(String(nextUrl))
          const sourceSize = await resolveSourceSize(String(nextUrl), imgEl.naturalWidth || 1, imgEl.naturalHeight || 1)

          if (!imageObj) {
            imageObj = new FabricImage(imgEl as HTMLImageElement, {
              originX: 'center',
              originY: 'center',
              left: 0,
              top: 0,
              objectCaching: false,
              visible: true,
              opacity: 1,
            } as ImageProps)
            children.forEach((ch) => obj.remove(ch))
          } else {
            try { (imageObj as unknown as { setElement?: (el: HTMLImageElement) => void }).setElement?.(imgEl) } catch {}
            imageObj.set({
              originX: 'center',
              originY: 'center',
              left: 0,
              top: 0,
              objectCaching: false,
              visible: true,
              opacity: 1,
            } as unknown as ImageProps)
          }

          applyImageToGroup(imageObj, sourceSize.width, sourceSize.height)
        } catch (err) {
          console.error('[WindDirectionStore] updateElement reload error', err)
        }
      } else if (hasExplicitSize) {
        this.setImageSize(
          element,
          Number(config.width ?? currentStoredW ?? 60),
          Number(config.height ?? currentStoredH ?? 60),
        )
      }

      if (!shouldReloadImage && config.assetId !== undefined) {
        ;(obj as unknown as { assetId?: number }).assetId = config.assetId
      }
      if (!shouldReloadImage && config.color !== undefined) {
        ;(obj as unknown as { color?: string }).color = nextColor
      }

      if (config.windDegree !== undefined) {
        obj.set('angle', config.windDegree)
        ;(obj as unknown as { windDegree?: number }).windDegree = config.windDegree
        obj.setCoords()
      }

      if (shouldLockPosition && prevPos) {
        obj.set('left', (prevPos.left ?? obj.left) as never)
        obj.set('top', (prevPos.top ?? obj.top) as never)
      }
      canvas.setActiveObject(obj as unknown as FabricObject)
      canvas.renderAll()
    },

    setImageSize(element: FabricElement, width: number, height: number): void {
      const canvas = this.baseStore.canvas
      if (!canvas) return
      const obj = (canvas.getObjects() as Array<FabricObject & FabricElement>)
        .find((o) => (o as unknown as FabricElement).id === element.id) as FabricGroup | undefined
      if (!obj) return
      attachManualScaleSync(obj)
      const imageObj = obj.getObjects().find((c) => (c as unknown as { role?: string }).role === 'image') as unknown as FabricImage | undefined
      const w = Math.max(1, Number(width))
      const h = Math.max(1, Number(height))
      if (imageObj) {
        const sourceW = (obj as unknown as { windSourceWidth?: number }).windSourceWidth
          ?? (imageObj as unknown as { width?: number }).width
          ?? 1
        const sourceH = (obj as unknown as { windSourceHeight?: number }).windSourceHeight
          ?? (imageObj as unknown as { height?: number }).height
          ?? 1
        const { width: renderW, height: renderH, scale } = getProportionalSize(sourceW, sourceH, w, h, 60)
        imageObj.set({ scaleX: scale, scaleY: scale } as unknown as ImageProps)
        imageObj.setCoords()
        obj.remove(imageObj as unknown as FabricObject)
        obj.add(imageObj as unknown as FabricObject)
        ;(obj as unknown as { windWidth?: number }).windWidth = renderW
        ;(obj as unknown as { windHeight?: number }).windHeight = renderH
        ;(obj as unknown as { windSourceWidth?: number }).windSourceWidth = sourceW
        ;(obj as unknown as { windSourceHeight?: number }).windSourceHeight = sourceH
        obj.setCoords()
      } else {
        ;(obj as unknown as { windWidth?: number }).windWidth = w
        ;(obj as unknown as { windHeight?: number }).windHeight = h
        ;(obj as unknown as { windSourceWidth?: number }).windSourceWidth = w
        ;(obj as unknown as { windSourceHeight?: number }).windSourceHeight = h
      }
      obj.setCoords()
      canvas.renderAll()
    },

    setWindDegree(element: FabricElement, degree: number): void {
      const canvas = this.baseStore.canvas
      if (!canvas) return
      const obj = (canvas.getObjects() as Array<FabricObject & FabricElement>)
        .find((o) => (o as unknown as FabricElement).id === element.id) as FabricGroup | undefined
      if (!obj) return
      const clamped = ((degree % 360) + 360) % 360
      obj.set('angle', clamped)
      ;(obj as unknown as { windDegree?: number }).windDegree = clamped
      obj.setCoords()
      canvas.renderAll()
    },

    encodeConfig(element: FabricElement): WindDirectionElementConfig {
      const imageUrl = (element as unknown as { windImageUrl?: string }).windImageUrl
      const width = (element as unknown as { windWidth?: number }).windWidth ?? (element as unknown as { width?: number }).width
      const height = (element as unknown as { windHeight?: number }).windHeight ?? (element as unknown as { height?: number }).height
      const windDegree = (element as unknown as { windDegree?: number }).windDegree ?? (element.angle ?? 0)
      const assetId = (element as unknown as { assetId?: number }).assetId
      const color = (element as unknown as { color?: string }).color
      return {
        eleType: 'windDirection',
        id: String(element.id ?? ''),
        left: Number(element.left),
        top: Number(element.top),
        originX: 'center',
        originY: 'center',
        imageUrl,
        width,
        height,
        windDegree,
        assetId,
        color,
      }
    },

    decodeConfig(config: WindDirectionElementConfig): Partial<FabricElement> {
      return {
        eleType: 'windDirection',
        id: config.id ?? nanoid(),
        left: config.left,
        top: config.top,
        originX: config.originX,
        originY: config.originY,
        imageUrl: config.imageUrl,
        width: config.width,
        height: config.height,
        windDegree: config.windDegree,
        assetId: config.assetId,
        color: config.color,
      }
    },
  },
})

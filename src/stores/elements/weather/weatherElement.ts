import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import { Group as FabricGroup, type GroupProps, type FabricObject, Image as FabricImage, type ImageProps } from 'fabric'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import type { FabricElement } from '@/types/element'
import type { MinimalFabricLike } from '@/types/layer'
import type { WeatherElementConfig } from '@/types/elements/data'

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

function isSvgUrl(url?: string): boolean {
  if (!url) return false
  const u = url.toLowerCase()
  return u.startsWith('data:image/svg+xml') || u.endsWith('.svg')
}

async function recolorSvgToDataUrl(svgSourceUrl: string, color: string): Promise<string> {
  try {
    let svgText = ''
    if (svgSourceUrl.startsWith('data:image/svg+xml')) {
      const raw = decodeURIComponent(svgSourceUrl.split(',')[1] || '')
      svgText = raw
    } else {
      const res = await fetch(svgSourceUrl, { mode: 'cors' })
      svgText = await res.text()
    }
    // Inject style setting fill/stroke; preserve viewBox etc.
    const hasStyle = /<style[\s\S]*?>[\s\S]*?<\/style>/i.test(svgText)
    const styleTag = `<style>* { fill: ${color} !important; stroke: ${color} !important; }</style>`
    let patched = svgText
    if (hasStyle) {
      patched = svgText.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/i, styleTag)
    } else {
      patched = svgText.replace(/<svg(\b[^>]*)>/i, (_m, attrs) => `<svg${attrs}>${styleTag}`)
    }
    const encoded = encodeURIComponent(patched)
    return `data:image/svg+xml,${encoded}`
  } catch (e) {
    console.warn('[WeatherStore] recolorSvgToDataUrl failed, using original', e)
    return svgSourceUrl
  }
}

export const useWeatherStore = defineStore('weatherElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return { baseStore, layerStore }
  },
  actions: {
    addElement(config: WeatherElementConfig): Promise<FabricElement> {
      console.log('add wecdsa Element', config)
      
      const id = config.id || nanoid()
      const cx = config.left ?? 0
      const cy = config.top ?? 0
      config.fill = config.fill || '#ffffff'
      
      const addGroupToCanvas = (group: FabricGroup) => {
        ;(group as unknown as { id?: string }).id = id
        ;(group as unknown as { eleType?: string }).eleType = 'weather'
        if (config.fontFamily) (group as unknown as { fontFamily?: string }).fontFamily = config.fontFamily
        if (config.fill) (group as unknown as { fill?: string }).fill = config.fill
        this.baseStore.canvas?.add(group as unknown as FabricObject)
        this.layerStore.addLayer(group as unknown as MinimalFabricLike)
        this.baseStore.canvas?.setActiveObject(group as unknown as FabricObject)
        this.baseStore.canvas?.renderAll()
        return group as unknown as FabricElement
      }

      let imgUrl = config.imageUrl ? normalizeUrl(String(config.imageUrl)) : ''
      const imgW = config.width ?? Math.max(1, Math.round((config.fontSize ?? 42)))
      const imgH = config.height ?? imgW
      if (!imgUrl) imgUrl = getDefaultWeatherImage()

      return new Promise<FabricElement>((resolve) => {
        const createEmptyGroup = () => {
          const group = new FabricGroup([], {
            left: cx,
            top: cy,
            originX: 'center',
            originY: 'center',
            selectable: true,
            hasControls: false,
            hasBorders: true,
            objectCaching: false,
          } as GroupProps)
          ;(group as unknown as { weatherIsImage?: boolean }).weatherIsImage = true
          if (imgUrl) (group as unknown as { weatherImageUrl?: string }).weatherImageUrl = imgUrl
          ;(group as unknown as { width?: number }).width = imgW
          ;(group as unknown as { height?: number }).height = imgH
          if (config.fontFamily) (group as unknown as { fontFamily?: string }).fontFamily = config.fontFamily
          if (config.fill) (group as unknown as { fill?: string }).fill = config.fill
          const el = addGroupToCanvas(group)
          resolve(el)
        }

        if (!imgUrl) {
          createEmptyGroup()
          return
        }
        let resolved = false
        setTimeout(() => { if (!resolved) console.warn('[WeatherStore] addElement image load not resolved yet', { imgUrl }) }, 2000)
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
              hasControls: false,
              hasBorders: true,
              objectCaching: false,
              visible: true,
            } as GroupProps)
            ;(group as unknown as { weatherImageUrl?: string }).weatherImageUrl = imgUrl
            ;(group as unknown as { width?: number }).width = imgW
            ;(group as unknown as { height?: number }).height = imgH
            ;(group as unknown as { weatherIsImage?: boolean }).weatherIsImage = true
            if (config.fontFamily) (group as unknown as { fontFamily?: string }).fontFamily = config.fontFamily
            if (config.fill) (group as unknown as { fill?: string }).fill = config.fill
            const el = addGroupToCanvas(group)
            resolve(el)
          })
          .catch((err) => {
            console.error('[WeatherStore] addElement image load error, creating empty group', { imgUrl, err })
            createEmptyGroup()
          })
      })
    },

    updateElement(element: FabricElement, config: Partial<WeatherElementConfig>) {
      const canvas = this.baseStore.canvas
      if (!canvas) return
      const obj = (canvas.getObjects() as Array<FabricObject & FabricElement>).find((o) => (o as unknown as FabricElement).id === element.id) as FabricGroup | undefined
      if (!obj) return
      const shouldLockPosition = (config.left === undefined && config.top === undefined)
      const prevPos = shouldLockPosition ? { left: (obj as unknown as { left?: number }).left, top: (obj as unknown as { top?: number }).top } : null
      if (config.left !== undefined) obj.set('left', config.left as never)
      if (config.top !== undefined) obj.set('top', config.top as never)
      if (config.fontFamily !== undefined) (obj as unknown as { fontFamily?: string }).fontFamily = config.fontFamily
      if (config.fill !== undefined) (obj as unknown as { fill?: string }).fill = config.fill
      const children = obj.getObjects() as FabricObject[]
      const imageObj = children.find(c => (c as unknown as { role?: string }).role === 'image') as unknown as FabricImage | undefined
      const currentUrlRaw = (obj as unknown as { weatherImageUrl?: string }).weatherImageUrl
      const currentUrl = currentUrlRaw ? normalizeUrl(String(currentUrlRaw)) : undefined
      const newUrlRaw = config.imageUrl ?? currentUrlRaw
      const newUrl = newUrlRaw ? normalizeUrl(String(newUrlRaw)) : undefined
      const newW = (config as unknown as { width?: number }).width ?? (obj as unknown as { width?: number }).width
      const newH = (config as unknown as { height?: number }).height ?? (obj as unknown as { height?: number }).height
      const colorForSvg = (obj as unknown as { fill?: string }).fill

      const maybeColorizedUrlPromise = async (): Promise<string | undefined> => {
        if (!newUrl) return undefined
        if (!isSvgUrl(newUrl)) return newUrl
        if (!colorForSvg) return newUrl
        return recolorSvgToDataUrl(String(newUrl), String(colorForSvg))
      }

      if (!imageObj && newUrl) {
        let resolved = false
        setTimeout(() => { if (!resolved) console.warn('[WeatherStore] updateElement image load not resolved yet', { newUrl }) }, 2000)
        ;(async () => await maybeColorizedUrlPromise())()
          .then((finalUrl) => loadHtmlImage(String(finalUrl || newUrl)))
          .then((imgEl) => {
            resolved = true
            const image = new FabricImage(imgEl as HTMLImageElement, { originX: 'center', originY: 'center', left: 0, top: 0, objectCaching: false, visible: true, opacity: 1 } as ImageProps)
            if (newW) image.scaleToWidth(Number(newW))
            if (newH) image.scaleToHeight(Number(newH))
            {
              const iw = (image as unknown as { width?: number }).width ?? 1
              const ih = (image as unknown as { height?: number }).height ?? 1
              const sw = image.getScaledWidth?.() ?? 0
              const sh = image.getScaledHeight?.() ?? 0
              if (sw === 0 || sh === 0) {
                const sx = Math.max(1, Number(newW ?? iw)) / Math.max(1, iw)
                const sy = Math.max(1, Number(newH ?? ih)) / Math.max(1, ih)
                image.set({ scaleX: sx, scaleY: sy } as unknown as ImageProps)
              }
            }
            ;(image as unknown as { role?: string }).role = 'image'
            children.forEach(ch => obj.remove(ch))
            obj.add(image as unknown as FabricObject)
            ;(obj as unknown as { weatherIsImage?: boolean }).weatherIsImage = true
            ;(obj as unknown as { weatherImageUrl?: string }).weatherImageUrl = String(newUrl)
            if (newW != null) (obj as unknown as { width?: number }).width = Number(newW)
            if (newH != null) (obj as unknown as { height?: number }).height = Number(newH)
            obj.set({ visible: true } as unknown as GroupProps)
            obj.setCoords()
            try { (obj as unknown as { bringToFront?: () => void }).bringToFront?.() } catch {}
            canvas.setActiveObject(obj as unknown as FabricObject)
            canvas.requestRenderAll()
          })
          .catch((err) => {
            console.error('[WeatherStore] updateElement image load error', { newUrl, err })
          })
      } else if (imageObj) {
        if (newUrl && newUrl !== currentUrl) {
          let resolved = false
          setTimeout(() => { if (!resolved) console.warn('[WeatherStore] updateElement replace image load not resolved yet', { to: config.imageUrl }) }, 2000)
          ;(async () => await maybeColorizedUrlPromise())()
            .then((finalUrl) => loadHtmlImage(String(finalUrl || newUrl)))
            .then((imgEl) => {
              resolved = true
              try { (imageObj as unknown as { setElement?: (el: HTMLImageElement) => void }).setElement?.(imgEl as HTMLImageElement) } catch {}
              imageObj.set({ originX: 'center', originY: 'center', left: 0, top: 0, objectCaching: false, visible: true, opacity: 1 } as unknown as ImageProps)
              if (newW) imageObj.scaleToWidth(Number(newW))
              if (newH) imageObj.scaleToHeight(Number(newH))
              {
                const iw = (imageObj as unknown as { width?: number }).width ?? 1
                const ih = (imageObj as unknown as { height?: number }).height ?? 1
                const sw = imageObj.getScaledWidth?.() ?? 0
                const sh = imageObj.getScaledHeight?.() ?? 0
                if (sw === 0 || sh === 0) {
                  const sx = Math.max(1, Number(newW ?? iw)) / Math.max(1, iw)
                  const sy = Math.max(1, Number(newH ?? ih)) / Math.max(1, ih)
                  imageObj.set({ scaleX: sx, scaleY: sy } as unknown as ImageProps)
                }
              }
              ;(imageObj as unknown as { role?: string }).role = 'image'
              ;(obj as unknown as { weatherImageUrl?: string }).weatherImageUrl = String(newUrl)
              if (newW != null) (obj as unknown as { width?: number }).width = Number(newW)
              if (newH != null) (obj as unknown as { height?: number }).height = Number(newH)
              imageObj.setCoords?.()
              obj.remove(imageObj as unknown as FabricObject)
              obj.add(imageObj as unknown as FabricObject)
              obj.set({ visible: true } as unknown as GroupProps)
              obj.setCoords()
              try { (obj as unknown as { bringToFront?: () => void }).bringToFront?.() } catch {}
              canvas.setActiveObject(obj as unknown as FabricObject)
              canvas.requestRenderAll()
            })
            .catch((err) => {
              console.error('[WeatherStore] updateElement replace image load error', { to: config.imageUrl, err })
            })
        } else {
          const targetW = Math.max(1, Number(newW ?? (obj as unknown as { width?: number }).width))
          const targetH = Math.max(1, Number(newH ?? (obj as unknown as { height?: number }).height))
          this.setImageSize(element, targetW, targetH)
          // recolor current image in-place if only color changed and it's SVG
          if (isSvgUrl(currentUrl) && colorForSvg) {
            ;(async () => await recolorSvgToDataUrl(String(currentUrl), String(colorForSvg)))()
              .then((finalUrl) => {
                if (!finalUrl) return
                return loadHtmlImage(String(finalUrl))
              })
              .then((imgEl) => {
                if (!imgEl) return
                try { (imageObj as unknown as { setElement?: (el: HTMLImageElement) => void }).setElement?.(imgEl as HTMLImageElement) } catch {}
                imageObj.setCoords?.()
                obj.remove(imageObj as unknown as FabricObject)
                obj.add(imageObj as unknown as FabricObject)
                obj.setCoords()
                canvas.requestRenderAll()
              })
              .catch(() => {})
          }
        }
      }
      if (shouldLockPosition && prevPos) {
        obj.set('left', (prevPos.left ?? obj.left) as never)
        obj.set('top', (prevPos.top ?? obj.top) as never)
      }
      canvas.renderAll()
    },

    setImageSize(element: FabricElement, width: number, height: number): void {
      const canvas = this.baseStore.canvas
      if (!canvas) return
      const obj = (canvas.getObjects() as Array<FabricObject & FabricElement>).find((o) => (o as unknown as FabricElement).id === element.id) as FabricGroup | undefined
      if (!obj) return
      const children = obj.getObjects() as FabricObject[]
      const imageObj = children.find(c => (c as unknown as { role?: string }).role === 'image') as unknown as FabricImage | undefined
      const w = Math.max(1, Number(width))
      const h = Math.max(1, Number(height))
      if (imageObj) {
        const origW = (imageObj as unknown as { width?: number }).width ?? 1
        const origH = (imageObj as unknown as { height?: number }).height ?? 1
        const scaleX = w / Math.max(1, origW)
        const scaleY = h / Math.max(1, origH)
        imageObj.set({ scaleX, scaleY } as unknown as ImageProps)
        imageObj.setCoords()
        obj.remove(imageObj as unknown as FabricObject)
        obj.add(imageObj as unknown as FabricObject)
        obj.setCoords()
      }
      ;(obj as unknown as { width?: number }).width = w
      ;(obj as unknown as { height?: number }).height = h
      obj.setCoords()
      canvas.renderAll()
    },

    encodeConfig(element: FabricElement): WeatherElementConfig {
      const fontFamily = (element as unknown as { fontFamily?: string }).fontFamily
      const fill = (element as unknown as { fill?: string }).fill || '#ffffff'
      const standard_sizes = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 21, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 96, 108, 120, 132, 144, 156, 168, 180, 192, 204, 216, 228, 240, 264, 288, 312]
      const fontSize = this.getClosestNumber(parseInt(String(element.width)), standard_sizes)
      return {
        eleType: 'weather',
        id: String(element.id ?? ''),
        left: parseInt(String(element.left)),
        top: parseInt(String(element.top)),
        originX: 'center',
        originY: 'center',
        width: parseInt(String(element.width)),
        height: parseInt(String(element.height)),
        fontFamily,
        fontSize,  
        fill,
      }
    },

    getClosestNumber(num: number, arr: number[]): number {
      return arr.reduce((prev, curr) => (Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev))
    },
    decodeConfig(config: WeatherElementConfig): Partial<FabricElement> {
      return {
        eleType: 'weather',
        id: config.id ?? nanoid(),
        left: config.left,
        top: config.top,
        originX: config.originX,
        originY: config.originY,
        imageUrl: config.imageUrl,
        width: config.width,
        height: config.height,
        fontFamily: config.fontFamily,
        fill: config.fill,
      }
    },
  },
})

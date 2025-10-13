import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import { Group as FabricGroup, type GroupProps, type FabricObject, Image as FabricImage, type ImageProps } from 'fabric'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import type { FabricElement } from '@/types/element'
import type { MinimalFabricLike } from '@/types/layer'
import type { MoonElementConfig } from '@/types/elements/data'
function getDefaultMoonImage(): string {
  return 'https://cdn.wristo.io/moonphase/h-phase-16.png'
}

// preload via native Image, then build FabricImage from element
function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // set crossOrigin only when not same-origin
    try {
      const u = new URL(url, window.location.href)
      const sameOrigin = u.origin === window.location.origin
      if (!sameOrigin) img.crossOrigin = 'anonymous'
    } catch {
      // ignore URL parse errors; let browser handle
    }
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = url
  })
}
function normalizeUrl(u: string): string {
  if (/^https?:\/\//.test(u) || u.startsWith('data:')) {
    return u
  }
  if (u.startsWith('@/')) {
    return new URL(u, import.meta.url).href
  }
  if (u.startsWith('/src/assets/')) {
    const aliased = u.replace('/src/', '@/')
    return new URL(aliased, import.meta.url).href
  }
  return u
}

export const useMoonStore = defineStore('moonElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return { baseStore, layerStore }
  },
  actions: {
    addElement(config: MoonElementConfig): Promise<FabricElement> {
      const id = config.id || nanoid()
      const cx = config.left ?? 0
      const cy = config.top ?? 0
      console.log('[MoonStore] addElement called', { id, cx, cy, cfg: { imageUrl: config.imageUrl, imageWidth: config.imageWidth, imageHeight: config.imageHeight, fontSize: config.fontSize } })

      const addGroupToCanvas = (group: FabricGroup) => {
        ;(group as unknown as { id?: string }).id = id
        ;(group as unknown as { eleType?: string }).eleType = 'moon'
        this.baseStore.canvas?.add(group as unknown as FabricObject)
        this.layerStore.addLayer(group as unknown as MinimalFabricLike)
        this.baseStore.canvas?.setActiveObject(group as unknown as FabricObject)
        this.baseStore.canvas?.renderAll()
        return group as unknown as FabricElement
      }

      // 仅图片模式
      let imgUrl = config.imageUrl ? normalizeUrl(String(config.imageUrl)) : ''
      const imgW = config.width ?? Math.max(1, Math.round((config.fontSize ?? 42)))
      const imgH = config.height ?? imgW
      if (!imgUrl) {
        imgUrl = getDefaultMoonImage()
        console.log('[MoonStore] addElement using default asset', { imgUrl })
      }
      console.log('[MoonStore] addElement image params', { imgUrl, imgW, imgH })
      return new Promise<FabricElement>((resolve) => {
        const createEmptyGroup = () => {
          const group = new FabricGroup([], {
            left: cx,
            top: cy,
            originX: 'center',
            originY: 'center',
            selectable: true,
            hasControls: true,
            hasBorders: true,
            objectCaching: false,
          } as GroupProps)
          ;(group as unknown as { moonIsImage?: boolean }).moonIsImage = true
          if (imgUrl) (group as unknown as { moonImageUrl?: string }).moonImageUrl = imgUrl
          ;(group as unknown as { width?: number }).width = imgW
          ;(group as unknown as { height?: number }).height = imgH
          console.log('[MoonStore] addElement created empty group', { id, imgUrlEmpty: !imgUrl })
          const el = addGroupToCanvas(group)
          resolve(el)
        }

        if (!imgUrl) {
          console.warn('[MoonStore] addElement no imageUrl and no default asset, creating empty group')
          createEmptyGroup()
          return
        }
        console.log('[MoonStore] addElement loading image via HTMLImageElement', { imgUrl })
        let resolved = false
        setTimeout(() => { if (!resolved) console.warn('[MoonStore] addElement image load not resolved yet', { imgUrl }) }, 2000)
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
            // guard zero size after scaling
            const iw = (image as unknown as { width?: number }).width ?? 1
            const ih = (image as unknown as { height?: number }).height ?? 1
            const sw = image.getScaledWidth?.() ?? 0
            const sh = image.getScaledHeight?.() ?? 0
            if (sw === 0 || sh === 0) {
              const sx = Math.max(1, imgW) / Math.max(1, iw)
              const sy = Math.max(1, imgH) / Math.max(1, ih)
              image.set({ scaleX: sx, scaleY: sy } as unknown as ImageProps)
            }
            console.log('[MoonStore] addElement image loaded & scaled', { w: image.getScaledWidth?.(), h: image.getScaledHeight?.() })
            ;(image as unknown as { role?: string }).role = 'image'
            const group = new FabricGroup([image as unknown as FabricObject], {
              left: cx,
              top: cy,
              originX: 'center',
              originY: 'center',
              selectable: true,
              hasControls: true,
              hasBorders: true,
              objectCaching: false,
              visible: true,
            } as GroupProps)
            ;(group as unknown as { moonImageUrl?: string }).moonImageUrl = imgUrl
            ;(group as unknown as { width?: number }).width = imgW
            ;(group as unknown as { height?: number }).height = imgH
            ;(group as unknown as { moonIsImage?: boolean }).moonIsImage = true
            console.log('[MoonStore] addElement group ready, adding to canvas', { id })
            const el = addGroupToCanvas(group)
            console.log('[MoonStore] addElement group added', { id })
            resolve(el)
          })
          .catch((err) => {
            console.error('[MoonStore] addElement image load error, creating empty group', { imgUrl, err })
            createEmptyGroup()
          })
      })
    },

    updateElement(element: FabricElement, config: Partial<MoonElementConfig>) {
      const canvas = this.baseStore.canvas
      if (!canvas) return
      const obj = (canvas.getObjects() as Array<FabricObject & FabricElement>).find((o) => (o as unknown as FabricElement).id === element.id) as FabricGroup | undefined
      if (!obj) return
      console.log('[MoonStore] updateElement payload (image-only)', JSON.stringify(config))
      console.log('[MoonStore] updateElement current meta', {
        hasCanvas: Boolean(canvas),
        id: element.id,
        stored: {
          url: (obj as unknown as { moonImageUrl?: string }).moonImageUrl,
          w: (obj as unknown as { width?: number }).width,
          h: (obj as unknown as { height?: number }).height,
        }
      })

      // preserve group position if caller didn't request move
      const shouldLockPosition = (config.left === undefined && config.top === undefined)
      const prevPos = shouldLockPosition ? { left: (obj as unknown as { left?: number }).left, top: (obj as unknown as { top?: number }).top } : null
      if (config.left !== undefined) obj.set('left', config.left as never)
      if (config.top !== undefined) obj.set('top', config.top as never)
      const children = obj.getObjects() as FabricObject[]
      const imageObj = children.find(c => (c as unknown as { role?: string }).role === 'image') as unknown as FabricImage | undefined
      const currentUrlRaw = (obj as unknown as { moonImageUrl?: string }).moonImageUrl
      const currentUrl = currentUrlRaw ? normalizeUrl(String(currentUrlRaw)) : undefined
      const newUrlRaw = config.imageUrl ?? currentUrlRaw
      const newUrl = newUrlRaw ? normalizeUrl(String(newUrlRaw)) : undefined
      const newW = (config as unknown as { width?: number }).width ?? (obj as unknown as { width?: number }).width
      const newH = (config as unknown as { height?: number }).height ?? (obj as unknown as { height?: number }).height
      console.log('[MoonStore] updateElement resolved params', { hasImageObj: Boolean(imageObj), newUrl, newW, newH, childRoles: children.map(c => (c as unknown as { role?: string }).role) })
      if (!imageObj && newUrl) {
        // 组内无图片，加载新增
        console.log('[MoonStore] updateElement loading new image via HTMLImageElement', { newUrl })
        let resolved = false
        setTimeout(() => { if (!resolved) console.warn('[MoonStore] updateElement image load not resolved yet', { newUrl }) }, 2000)
        loadHtmlImage(String(newUrl))
          .then((imgEl) => {
            resolved = true
            const image = new FabricImage(imgEl as HTMLImageElement, { originX: 'center', originY: 'center', left: 0, top: 0, objectCaching: false, visible: true, opacity: 1 } as ImageProps)
            if (newW) image.scaleToWidth(Number(newW))
            if (newH) image.scaleToHeight(Number(newH))
            // guard zero size after scaling
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
            console.log('[MoonStore] updateElement image loaded & scaled', { w: image.getScaledWidth?.(), h: image.getScaledHeight?.() })
            ;(image as unknown as { role?: string }).role = 'image'
            children.forEach(ch => obj.remove(ch))
            obj.add(image as unknown as FabricObject)
            ;(obj as unknown as { moonIsImage?: boolean }).moonIsImage = true
            ;(obj as unknown as { moonImageUrl?: string }).moonImageUrl = String(newUrl)
            if (newW != null) (obj as unknown as { width?: number }).width = Number(newW)
            if (newH != null) (obj as unknown as { height?: number }).height = Number(newH)
            obj.set({ visible: true } as unknown as GroupProps)
            obj.setCoords()
            try { (obj as unknown as { bringToFront?: () => void }).bringToFront?.() } catch {}
            canvas.setActiveObject(obj as unknown as FabricObject)
            canvas.requestRenderAll()
          })
          .catch((err) => {
            console.error('[MoonStore] updateElement image load error', { newUrl, err })
          })
      } else if (imageObj) {
        if (newUrl && newUrl !== currentUrl) {
          console.log('[MoonStore] updateElement replacing image', { from: (obj as unknown as { moonImageUrl?: string }).moonImageUrl, to: config.imageUrl })
          let resolved = false
          setTimeout(() => { if (!resolved) console.warn('[MoonStore] updateElement replace image load not resolved yet', { to: config.imageUrl }) }, 2000)
          loadHtmlImage(String(newUrl))
            .then((imgEl) => {
              resolved = true
              // update existing image element to avoid group layout shifts
              try {
                (imageObj as unknown as { setElement?: (el: HTMLImageElement) => void }).setElement?.(imgEl as HTMLImageElement)
              } catch {}
              imageObj.set({ originX: 'center', originY: 'center', left: 0, top: 0, objectCaching: false, visible: true, opacity: 1 } as unknown as ImageProps)
              if (newW) imageObj.scaleToWidth(Number(newW))
              if (newH) imageObj.scaleToHeight(Number(newH))
              // guard zero size after scaling
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
              ;(obj as unknown as { moonImageUrl?: string }).moonImageUrl = String(newUrl)
              if (newW != null) (obj as unknown as { width?: number }).width = Number(newW)
              if (newH != null) (obj as unknown as { height?: number }).height = Number(newH)
              imageObj.setCoords?.()
              // force group to recalc bounds by re-adding the updated child
              obj.remove(imageObj as unknown as FabricObject)
              obj.add(imageObj as unknown as FabricObject)
              obj.set({ visible: true } as unknown as GroupProps)
              obj.setCoords()
              try { (obj as unknown as { bringToFront?: () => void }).bringToFront?.() } catch {}
              canvas.setActiveObject(obj as unknown as FabricObject)
              canvas.requestRenderAll()
            })
            .catch((err) => {
              console.error('[MoonStore] updateElement replace image load error', { to: config.imageUrl, err })
            })
        } else {
          console.log('[MoonStore] updateElement resizing image', { w: newW, h: newH })
          const targetW = Math.max(1, Number(newW ?? (obj as unknown as { width?: number }).width))
          const targetH = Math.max(1, Number(newH ?? (obj as unknown as { height?: number }).height))
          // 统一走 setImageSize，保证缩放计算与渲染一致
          this.setImageSize(element, targetW, targetH)
        }
      }
      // restore position if we locked it
      if (shouldLockPosition && prevPos) {
        obj.set('left', (prevPos.left ?? obj.left) as never)
        obj.set('top', (prevPos.top ?? obj.top) as never)
      }
      console.log('[MoonStore] updateElement done renderAll')
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
      console.log('[MoonStore] setImageSize called', { id: (obj as unknown as { id?: string }).id, hasImageObj: Boolean(imageObj), targetW: w, targetH: h })
      if (imageObj) {
        const origW = (imageObj as unknown as { width?: number }).width ?? 1
        const origH = (imageObj as unknown as { height?: number }).height ?? 1
        const scaleX = w / Math.max(1, origW)
        const scaleY = h / Math.max(1, origH)
        imageObj.set({ scaleX, scaleY } as unknown as ImageProps)
        imageObj.setCoords()
        // force group bounds/coords to follow the resized child image
        obj.remove(imageObj as unknown as FabricObject)
        obj.add(imageObj as unknown as FabricObject)
        obj.setCoords()
        console.log('[MoonStore] setImageSize applied scales', { scaleX, scaleY, origW, origH, finalW: imageObj.getScaledWidth?.(), finalH: imageObj.getScaledHeight?.() })
      } else {
        console.warn('[MoonStore] setImageSize no image child found in group; updating metadata only')
      }
      ;(obj as unknown as { width?: number }).width = w
      ;(obj as unknown as { height?: number }).height = h
      obj.setCoords()
      canvas.renderAll()
      console.log('[MoonStore] setImageSize done renderAll')
    },

    encodeConfig(element: FabricElement): MoonElementConfig {
      const imageUrl = (element as unknown as { moonImageUrl?: string }).moonImageUrl
      const width = (element as unknown as { width?: number }).width
      const height = (element as unknown as { height?: number }).height
      return {
        eleType: 'moon',
        id: String(element.id ?? ''),
        left: Number(element.left),
        top: Number(element.top),
        originX: 'center',
        originY: 'center',
        imageUrl,
        width,
        height,
      }
    },

    decodeConfig(config: MoonElementConfig): Partial<FabricElement> {
      // 组对象由 addElement 创建；此处仅传递位置与样式，由 addElement 使用
      return {
        eleType: 'moon',
        id: config.id ?? nanoid(),
        left: config.left,
        top: config.top,
        originX: config.originX,
        originY: config.originY,
        imageUrl: config.imageUrl,
        width: config.width,
        height: config.height,
      }
    },
  },
})

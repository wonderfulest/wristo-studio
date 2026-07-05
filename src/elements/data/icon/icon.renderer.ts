import type { FabricElement } from '@/types/element'
import type { IconElementConfig } from '@/types/elements'
import { FabricObject, Image as FabricImage, FabricText, type ImageProps, type TextProps } from 'fabric'
import { nanoid } from 'nanoid'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { usePropertiesStore } from '@/stores/properties'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useIconFontStrategyStore } from '@/stores/iconFontStrategyStore'
import type { MinimalFabricLike } from '@/types/layer'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'
import { resolveIconGlyphText } from '@/utils/iconGlyph'
import { getDisplayState, normalizeDisplayStates } from '@/utils/displayStates'
import { applyControlsToObject } from '@/utils/controlManager'

const iconUpdateVersionById = new Map<string, number>()

const nextIconUpdateVersion = (id: unknown): number => {
  const key = String(id ?? '')
  if (!key) return 0
  const next = (iconUpdateVersionById.get(key) || 0) + 1
  iconUpdateVersionById.set(key, next)
  return next
}

const isLatestIconUpdate = (id: unknown, version: number): boolean => {
  const key = String(id ?? '')
  if (!key) return true
  return iconUpdateVersionById.get(key) === version
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    try {
      const u = new URL(url, window.location.href)
      if (u.origin !== window.location.origin) img.crossOrigin = 'anonymous'
    } catch {}
    img.onload = () => {
      console.log('[amoled-icon-renderer] image loaded', {
        url,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      })
      resolve(img)
    }
    img.onerror = (error) => {
      console.error('[amoled-icon-renderer] image load failed', { url, error })
      reject(error)
    }
    img.src = url
  })
}

const normalizeUrl = (url: string): string => {
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url
  return url
}

const firstPositiveNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    const next = Number(value)
    if (Number.isFinite(next) && next > 0) return next
  }
  return undefined
}

const resolveIconPixelSize = (...sources: Array<Record<string, any> | undefined>): number => {
  const size = firstPositiveNumber(...sources.flatMap((source) => [source?.fontSize, source?.iconSize]))
  return size ?? 24
}

const resolveIconFontFamily = (...sources: Array<Record<string, any> | undefined>): string => {
  for (const source of sources) {
    const font = String(source?.fontFamily || source?.iconFont || '').trim()
    if (font) return font
  }
  return useIconFontStrategyStore().currentIconFontSlug || 'wristo-icon'
}

const createAmoledImage = async (config: Partial<IconElementConfig> & Record<string, any>, base: Record<string, any>) => {
  const imageUrl = normalizeUrl(String(config.amoledImageUrl || config.imageUrl || ''))
  if (!imageUrl) {
    console.warn('[amoled-icon-renderer] skip create AMOLED image: empty imageUrl', {
      amoledImageUrl: config.amoledImageUrl,
      imageUrl: config.imageUrl,
      amoledIconUnicode: config.amoledIconUnicode
    })
    return null
  }
  console.log('[amoled-icon-renderer] create AMOLED image start', {
    imageUrl,
    amoledIconUnicode: config.amoledIconUnicode,
    width: config.width,
    height: config.height,
    iconSize: config.iconSize,
    fontSize: config.fontSize
  })
  const imgEl = await loadHtmlImage(imageUrl)
  const image = new FabricImage(imgEl, {
    ...base,
    originX: 'center',
    originY: 'center',
    designerControlMode: 'default',
    objectCaching: false,
    visible: true,
    opacity: 1,
    hasControls: false,
    lockScalingX: true,
    lockScalingY: true,
    lockScalingFlip: true
  } as unknown as ImageProps) as unknown as FabricImage & FabricElement
  const targetSize = resolveIconPixelSize(config, base)
  const targetW = targetSize
  const targetH = targetSize
  image.scaleToWidth(Math.max(1, targetW))
  image.scaleToHeight(Math.max(1, targetH))
  const imageW = Number((image as any).width || imgEl.naturalWidth || 1)
  const imageH = Number((image as any).height || imgEl.naturalHeight || 1)
  const scaledW = image.getScaledWidth?.() ?? 0
  const scaledH = image.getScaledHeight?.() ?? 0
  if (scaledW === 0 || scaledH === 0) {
    image.set({
      scaleX: Math.max(1, targetW) / Math.max(1, imageW),
      scaleY: Math.max(1, targetH) / Math.max(1, imageH)
    } as unknown as ImageProps)
  }
  ;(image as any).iconDisplayType = 'amoled'
  ;(image as any).amoledImageUrl = imageUrl
  ;(image as any).imageUrl = imageUrl
  ;(image as any).amoledIconUnicode = config.amoledIconUnicode
  ;(image as any).amoledWidth = targetW
  ;(image as any).amoledHeight = targetH
  ;(image as any).fontSize = targetSize
  ;(image as any).iconSize = targetSize
  image.set({
    hasControls: false,
    lockScalingX: true,
    lockScalingY: true
  } as unknown as ImageProps)
  applyControlsToObject(image as unknown as FabricObject)
  console.log('[amoled-icon-renderer] create AMOLED image done', {
    imageUrl,
    amoledIconUnicode: config.amoledIconUnicode,
    targetW,
    targetH,
    scaleX: (image as any).scaleX,
    scaleY: (image as any).scaleY
  })
  return image
}

const createMipText = (text: string, base: Record<string, any>) => {
  const element = new FabricText(resolveIconGlyphText(text), base as TextProps & IconElementConfig) as unknown as FabricText & FabricElement
  ;(element as any).iconDisplayType = 'mip'
  return element
}

export async function createIcon(config: IconElementConfig): Promise<FabricElement> {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()
  const iconFontStrategyStore = useIconFontStrategyStore()

  const canvas = canvasStore.canvas
  if (!canvas) {
    throw new Error('Canvas is not initialized, cannot add icon element')
  }

  type IconProps = TextProps & IconElementConfig
  const metric = usePropertiesStore().getMetricByOptions(config)
  const strategy = iconFontStrategyStore
  const resolvedFontFamily = resolveIconFontFamily(config as any, { fontFamily: strategy.currentIconFontSlug })

  const fallbackSize = Number((config as any).iconSize ?? (config as any).fontSize ?? 24)
  const resolvedFontSize = strategy.currentIconFontSize === -1 ? (Number.isFinite(fallbackSize) && fallbackSize > 0 ? fallbackSize : 24) : strategy.currentIconFontSize
  const displayStates = normalizeDisplayStates(config.displayStates)

  const iconOptions: Partial<IconProps> = {
    id: config.id || nanoid(),
    eleType: 'icon',
    left: config.left,
    top: config.top,
    originX: 'center',
    originY: 'center',
    fill: config.fill,
    fontSize: resolvedFontSize,
    fontFamily: String(resolvedFontFamily || 'wristo-icon'),
    metricSymbol: config.metricSymbol,
    dataProperty: config.dataProperty,
    goalProperty: config.goalProperty,
    displayStates,
    visible: getDisplayState(displayStates, layerStore.previewMode),
    selectable: true,
    hasControls: false,
    hasBorders: true
  }

  let element: FabricElement | null = null
  if ((config as any).iconDisplayType === 'amoled' && (config as any).amoledImageUrl) {
    try {
      element = await createAmoledImage(config as any, iconOptions as any)
    } catch (error) {
      console.error('[amoled-icon-renderer] createIcon AMOLED image failed, fallback to MIP text', {
        amoledImageUrl: (config as any).amoledImageUrl,
        amoledIconUnicode: (config as any).amoledIconUnicode,
        error
      })
    }
  }
  if (!element) {
    element = createMipText((metric as any)?.icon, iconOptions as any) as unknown as FabricElement
  }

  canvas.add(element as unknown as FabricObject)
  layerStore.addLayer(element as unknown as MinimalFabricLike)
  canvas.setActiveObject(element as unknown as FabricObject)
  canvas.renderAll()

  const id = (element as any).id ?? config.id ?? nanoid()
  elementDataStore.upsertElement({
    id: String(id),
    eleType: 'icon',
    left: (element as any).left ?? config.left ?? 0,
    top: (element as any).top ?? config.top ?? 0,
    fill: (element as any).fill ?? config.fill ?? '#ffffff',
    originX: 'center',
    originY: 'center',
    fontFamily: (element as any).fontFamily ?? resolvedFontFamily,
    fontSize: Number((element as any).fontSize ?? resolvedFontSize),
    iconFont: (element as any).fontFamily ?? resolvedFontFamily,
    iconSize: Number((element as any).fontSize ?? resolvedFontSize),
    dataProperty: (element as any).dataProperty ?? config.dataProperty ?? null,
    goalProperty: (element as any).goalProperty ?? config.goalProperty ?? null,
    metricSymbol: (element as any).metricSymbol ?? config.metricSymbol ?? '',
    iconDisplayType: (element as any).iconDisplayType ?? (config as any).iconDisplayType ?? 'mip',
    amoledImageUrl: (element as any).amoledImageUrl ?? (config as any).amoledImageUrl,
    amoledIconUnicode: (element as any).amoledIconUnicode ?? (config as any).amoledIconUnicode,
    width: (element as any).amoledWidth ?? resolveIconPixelSize(element as any, config as any),
    height: (element as any).amoledHeight ?? resolveIconPixelSize(element as any, config as any),
    displayStates,
    topBase: encodeTopBaseForElement(element as unknown as FabricElement)
  } as any)

  return element as unknown as FabricElement
}

export async function updateIcon(element: FabricElement, config: Partial<IconElementConfig>): Promise<void> {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  const elementDataStore = useElementDataStore()
  if (!canvas) return

  const objects = canvas.getObjects() as FabricObject[]
  const obj = objects.find((o) => (o as unknown as FabricElement).id === (element as any).id) as (FabricObject & FabricElement) | undefined
  if (!obj) return

  const currentLeft = obj.left
  const currentTop = obj.top
  const updateVersion = nextIconUpdateVersion((obj as any).id)
  const nextDisplayType = (config.iconDisplayType || (obj as any).iconDisplayType || 'mip') as 'mip' | 'amoled'

  const baseProps: Record<string, any> = {
    id: (obj as any).id,
    eleType: 'icon',
    left: config.left ?? currentLeft,
    top: config.top ?? currentTop,
    originX: 'center',
    originY: 'center',
    fill: config.fill ?? (obj as any).fill,
    fontSize: config.fontSize ?? (obj as any).fontSize,
    fontFamily: resolveIconFontFamily(config as any, obj as any),
    metricSymbol: config.metricSymbol ?? (obj as any).metricSymbol,
    dataProperty: config.dataProperty ?? (obj as any).dataProperty,
    goalProperty: config.goalProperty ?? (obj as any).goalProperty,
    displayStates: config.displayStates ? normalizeDisplayStates(config.displayStates) : normalizeDisplayStates((obj as any).displayStates),
    visible: getDisplayState(config.displayStates ? normalizeDisplayStates(config.displayStates) : normalizeDisplayStates((obj as any).displayStates), useLayerStore().previewMode),
    selectable: true,
    hasControls: false,
    hasBorders: true
  }

  const replaceObject = (nextObj: FabricObject & FabricElement) => {
    const all = canvas.getObjects() as FabricObject[]
    const index = Math.max(0, all.indexOf(obj))
    const activeBefore = canvas.getActiveObjects?.() as any[]
    console.log('[amoled-icon-renderer] replace object start', {
      id: (obj as any).id,
      oldType: (obj as any).type,
      oldEleType: (obj as any).eleType,
      nextType: (nextObj as any).type,
      nextEleType: (nextObj as any).eleType,
      objectCountBefore: all.length,
      sameIdCountBefore: all.filter((item: any) => String(item?.id) === String((obj as any).id)).length,
      activeBefore: activeBefore.map((item: any) => ({
        id: item?.id,
        type: item?.type,
        eleType: item?.eleType
      }))
    })
    canvas.discardActiveObject?.()
    canvas.remove(obj)
    if (typeof (canvas as any).insertAt === 'function') {
      ;(canvas as any).insertAt(index, nextObj)
    } else {
      canvas.add(nextObj)
    }
    ;(canvas.getObjects() as any[])
      .filter((item) => item !== nextObj && String(item?.id) === String((nextObj as any).id))
      .forEach((duplicate) => {
        console.warn('[amoled-icon-renderer] remove duplicate object after replace', {
          id: duplicate?.id,
          type: duplicate?.type,
          eleType: duplicate?.eleType
        })
        canvas.remove(duplicate)
      })
    useLayerStore().addLayer(nextObj as unknown as MinimalFabricLike)
    canvas.setActiveObject(nextObj)
    const id = (nextObj as any).id
    if (id != null) {
      useCanvasStore().setActiveIds([String(id)])
      useLayerStore().selectOne(String(id))
    }
    const objectsAfter = canvas.getObjects() as any[]
    console.log('[amoled-icon-renderer] replace object done', {
      id,
      objectCountAfter: objectsAfter.length,
      sameIdCountAfter: objectsAfter.filter((item: any) => String(item?.id) === String(id)).length,
      activeAfter: (canvas.getActiveObjects?.() as any[]).map((item: any) => ({
        id: item?.id,
        type: item?.type,
        eleType: item?.eleType
      })),
      canvasStoreActiveIds: useCanvasStore().activeIds,
      layerSelectedIds: useLayerStore().selectedLayerIds
    })
    return nextObj
  }

  let target = obj

  if (nextDisplayType === 'amoled') {
    const imageUrl = String(config.amoledImageUrl || (obj as any).amoledImageUrl || '')
    if (imageUrl) {
      try {
        const imageObj = await createAmoledImage(
          {
            ...config,
            amoledImageUrl: imageUrl,
            amoledIconUnicode: config.amoledIconUnicode ?? (obj as any).amoledIconUnicode,
            width: resolveIconPixelSize(config as any, obj as any, baseProps),
            height: resolveIconPixelSize(config as any, obj as any, baseProps)
          } as any,
          baseProps
        )
        if (!isLatestIconUpdate((obj as any).id, updateVersion)) {
          console.warn('[amoled-icon-renderer] stale AMOLED image update skipped', {
            id: (obj as any).id,
            imageUrl,
            requestedDisplayType: nextDisplayType
          })
          return
        }
        if (imageObj) {
          const currentById = (canvas.getObjects() as any[]).find((item) => String(item?.id) === String((obj as any).id)) as (FabricObject & FabricElement) | undefined
          if (currentById && currentById !== obj) {
            ;(canvas.getObjects() as any[])
              .filter((item) => item !== currentById && String(item?.id) === String((obj as any).id))
              .forEach((duplicate) => {
                console.warn('[amoled-icon-renderer] remove duplicate object after stale replace skip', {
                  id: duplicate?.id,
                  type: duplicate?.type,
                  eleType: duplicate?.eleType
                })
                canvas.remove(duplicate)
              })
            console.warn('[amoled-icon-renderer] stale replace skipped: object was already replaced during image load', {
              id: (obj as any).id,
              staleType: (obj as any).type,
              currentType: (currentById as any).type,
              currentEleType: (currentById as any).eleType,
              sameIdCount: (canvas.getObjects() as any[]).filter((item) => String(item?.id) === String((obj as any).id)).length
            })
            target = currentById
          } else {
            target = replaceObject(imageObj as unknown as FabricObject & FabricElement)
          }
        }
      } catch (error) {
        console.error('[amoled-icon-renderer] updateIcon AMOLED image failed', {
          imageUrl,
          amoledIconUnicode: config.amoledIconUnicode ?? (obj as any).amoledIconUnicode,
          error
        })
      }
    } else {
      console.warn('[amoled-icon-renderer] updateIcon AMOLED requested without imageUrl', {
        config,
        objectAmoledImageUrl: (obj as any).amoledImageUrl
      })
    }
  } else if ((obj as any).iconDisplayType === 'amoled' || (obj as any).type !== 'text') {
    const metric = usePropertiesStore().getMetricByOptions({
      ...config,
      dataProperty: baseProps.dataProperty,
      goalProperty: baseProps.goalProperty,
      metricSymbol: baseProps.metricSymbol
    } as any)
    target = replaceObject(createMipText((metric as any)?.icon, {
      ...baseProps,
      fontFamily: resolveIconFontFamily(config as any, obj as any, baseProps)
    }) as unknown as FabricObject & FabricElement)
  }

  const nextIconPixelSize = resolveIconPixelSize(config as any, target as any, baseProps)
  const updateProps: Record<string, any> = {
    fontSize: config.fontSize,
    iconSize: (config as any).iconSize ?? config.fontSize,
    fill: config.fill,
    fontFamily: nextDisplayType === 'mip' ? resolveIconFontFamily(config as any, target as any, baseProps) : config.iconFont ?? config.fontFamily,
    originX: 'center',
    originY: 'center',
    left: config.left,
    top: config.top,
    metricSymbol: config.metricSymbol,
    dataProperty: config.dataProperty,
    goalProperty: config.goalProperty,
    iconDisplayType: nextDisplayType,
    amoledImageUrl: config.amoledImageUrl,
    imageUrl: config.amoledImageUrl,
    amoledIconUnicode: config.amoledIconUnicode,
    amoledWidth: nextDisplayType === 'amoled' ? nextIconPixelSize : undefined,
    amoledHeight: nextDisplayType === 'amoled' ? nextIconPixelSize : undefined,
    displayStates: config.displayStates ? normalizeDisplayStates(config.displayStates) : undefined,
    text: typeof (config as any).text === 'undefined' ? undefined : resolveIconGlyphText((config as any).text)
  }

  Object.entries(updateProps).forEach(([key, value]) => {
    if (value !== undefined) {
      target.set(key as keyof TextProps, value as never)
    }
  })

  if (config.displayStates !== undefined) {
    target.set('visible', getDisplayState(normalizeDisplayStates(config.displayStates), useLayerStore().previewMode))
  }

  if (config.left === undefined) target.set('left', currentLeft)
  if (config.top === undefined) target.set('top', currentTop)

  target.setCoords()
  canvas.renderAll()

  const objId = (target as any).id
  if (objId != null) {
    const encoded = {
      id: (target as any).id,
      eleType: 'icon' as const,
      left: target.left,
      top: target.top,
      fill: (target as any).fill,
      originX: 'center' as any,
      originY: 'center' as any,
      fontFamily: (target as any).fontFamily as string,
      fontSize: Number((target as any).fontSize ?? nextIconPixelSize),
      iconFont: (target as any).fontFamily as string,
      iconSize: Number((target as any).iconSize ?? (target as any).fontSize ?? nextIconPixelSize),
      dataProperty: (target as any).dataProperty,
      goalProperty: (target as any).goalProperty,
      metricSymbol: (target as any).metricSymbol,
      iconDisplayType: (target as any).iconDisplayType,
      amoledImageUrl: (target as any).amoledImageUrl,
      amoledIconUnicode: (target as any).amoledIconUnicode,
      width: nextDisplayType === 'amoled' ? nextIconPixelSize : ((target as any).amoledWidth ?? (target as any).width),
      height: nextDisplayType === 'amoled' ? nextIconPixelSize : ((target as any).amoledHeight ?? (target as any).height),
      displayStates: normalizeDisplayStates((target as any).displayStates),
      topBase: encodeTopBaseForElement(target as unknown as FabricElement)
    } satisfies IconElementConfig

    elementDataStore.patchElement(String(objId), encoded as any)
  }
}

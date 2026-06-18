import { nanoid } from 'nanoid'
import { FabricText, Rect } from 'fabric'
import type { FabricElement } from '@/types/element'
import type { TextElementConfig } from '@/types/elements'
import { useCanvasStore } from '@/stores/canvasStore'
import { useLayerStore } from '@/stores/layerStore'
import { resolveDataTextTemplate } from '@/utils/dataSimulator'
import { usePropertiesStore } from '@/stores/properties'

export function createScrollableText(config: TextElementConfig): FabricElement {
  const canvasStore = useCanvasStore()
  const layerStore = useLayerStore()
  const propertiesStore = usePropertiesStore()
  
  const canvas = canvasStore.canvas

  if (!canvas) {
    throw new Error('Canvas is not initialized, cannot add scrollable text element')
  }

  const propertyKey = typeof config.textProperty === 'string' ? config.textProperty : ''
  const propertyValue = propertyKey
    ? propertiesStore?.allProperties?.[propertyKey]?.value
    : undefined

  const template =
    (typeof propertyValue === 'string' && propertyValue !== ''
      ? propertyValue
      : (config as any).textTemplate ?? (config as any).text) ?? 'New Text'

  const resolvedText = resolveDataTextTemplate(template)

  const element = new FabricText(resolvedText || 'New Text', {
    id: config.id || nanoid(),
    eleType: 'scrollableText',
    left: config.left,
    top: config.top,
    fontSize: Number(config.fontSize) || 36,
    fill: config.fill || '#FFFFFF',
    fontFamily: config.fontFamily,
    selectable: true,
    hasControls: false,
    hasBorders: true,
    originX: 'center',
    originY: config.originY || 'center',
    scrollAreaWidth: (config as any).scrollAreaWidth,
    scrollAreaLeft:
      typeof (config as any).scrollAreaLeft === 'number'
        ? (config as any).scrollAreaLeft
        : config.left,
    scrollAreaTop:
      typeof (config as any).scrollAreaTop === 'number' ? (config as any).scrollAreaTop : config.top,
    scrollAreaBackground: (config as any).scrollAreaBackground,
    textProperty: config.textProperty,
    textTemplate: template,
  } as any)

  canvas.add(element as any)
  ;(element as any).elementId = (element as any).id
  layerStore.addLayer(element as any)
  canvas.renderAll()
  canvas.setActiveObject(element as any)

  startScrollableAnimation(element as any)

  return element as FabricElement
}

export function updateScrollableText(
  element: FabricElement,
  patch: Partial<TextElementConfig> & {
    scrollAreaWidth?: number
    scrollAreaLeft?: number
    scrollAreaTop?: number
    scrollAreaBackground?: string
  },
): void {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  const anyEl = element as any

  if (!canvas || !anyEl) return

  if (patch.left != null) anyEl.set('left', patch.left)
  if (patch.top != null) anyEl.set('top', patch.top)
  if (patch.fontSize != null) anyEl.set('fontSize', patch.fontSize)
  if (patch.fill != null) anyEl.set('fill', patch.fill)
  if (patch.fontFamily != null) anyEl.set('fontFamily', patch.fontFamily)
  if (patch.scrollAreaWidth != null) anyEl.scrollAreaWidth = patch.scrollAreaWidth
  if (patch.scrollAreaLeft != null) anyEl.scrollAreaLeft = patch.scrollAreaLeft
  if (patch.scrollAreaTop != null) anyEl.scrollAreaTop = patch.scrollAreaTop
  if (patch.scrollAreaBackground != null) anyEl.scrollAreaBackground = patch.scrollAreaBackground
  if (patch.textProperty != null) anyEl.textProperty = patch.textProperty
  if (patch.textTemplate != null) {
    anyEl.textTemplate = patch.textTemplate
    anyEl.set('text', resolveDataTextTemplate(patch.textTemplate))
  }

  anyEl.setCoords?.()
  canvas.renderAll()
}

// --- Scrollable animation helpers ---

export function pauseScrollableAnimation(element: FabricElement) {
  const anyEl = element as any
  const id = String(anyEl.id ?? '')
  if (!id) return
  if (anyEl.__scrollInterval) {
    clearInterval(anyEl.__scrollInterval)
    anyEl.__scrollInterval = null
  }
}

export function showScrollRegion(element: FabricElement) {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas) return

  const t = element as any
  const id = String(t.id ?? '')
  if (!id) return

  const baseX = t.scrollAreaLeft
  const configuredAreaWidth = Number(t.scrollAreaWidth ?? canvas.getWidth() ?? 0)
  const areaWidth = Math.max(configuredAreaWidth, 0)
  const originX = (t.originX ?? 'center') as string
  const originY = (t.originY ?? 'top') as string

  let regionStart = baseX
  if (originX === 'center') {
    regionStart = baseX - areaWidth / 2
  } else if (originX === 'right') {
    regionStart = baseX - areaWidth
  }
  const regionEnd = regionStart + areaWidth

  const textHeight = Number(t.height ?? t.fontSize ?? 20)
  const baseY = Number(t.top ?? 0)
  t.scrollAreaTop = baseY
  let regionTop = baseY
  if (originY === 'center') {
    regionTop = baseY - textHeight / 2
  } else if (originY === 'bottom') {
    regionTop = baseY - textHeight
  }

  const bg = (t as any).scrollAreaBackground
  const hasBg = typeof bg === 'string' && bg !== '' && bg !== 'transparent' && bg !== 'rgba(0,0,0,0)'

  const rect = new Rect({
    left: regionStart,
    top: regionTop,
    width: regionEnd - regionStart,
    height: textHeight,
    stroke: '#0a90ff',
    strokeWidth: 1,
    fill: hasBg ? bg : 'rgba(0,0,0,0)',
    selectable: false,
    evented: false,
    excludeFromExport: true,
  }) as any

  if (t.__scrollRegionRect) {
    canvas.remove(t.__scrollRegionRect)
  }
  t.__scrollRegionRect = rect
  canvas.add(rect)

  const objects = canvas.getObjects()
  const textIndex = objects.indexOf(t)
  if (textIndex >= 0 && typeof (canvas as any).moveTo === 'function') {
    ;(canvas as any).moveTo(rect, textIndex)
  }

  if (typeof (t as any).bringToFront === 'function') {
    ;(t as any).bringToFront()
  }

  canvas.requestRenderAll()
}

export function hideScrollRegion(element: FabricElement) {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas) return

  const t = element as any
  const rect = t.__scrollRegionRect
  const bg = (t as any).scrollAreaBackground
  const hasBg = typeof bg === 'string' && bg !== '' && bg !== 'transparent' && bg !== 'rgba(0,0,0,0)'
  if (rect && !hasBg) {
    canvas.remove(rect as any)
    t.__scrollRegionRect = null
    canvas.requestRenderAll()
  }
}

export function startScrollableAnimation(element: FabricElement) {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas) return

  const t = element as any

  const syncScrollAreaAndClip = (updateBasePosition: boolean) => {
    const tt = element as any
    if (!tt) return

    const left = Number(tt.left ?? 0)
    const top = Number(tt.top ?? 0)

    if (updateBasePosition) {
      tt.scrollAreaLeft = left
      tt.scrollAreaTop = top
    }

    const configuredAreaWidth = Number(tt.scrollAreaWidth ?? canvas.getWidth() ?? 0)
    const areaWidth = Math.max(configuredAreaWidth, 0)
    const originX = (tt.originX ?? 'center') as string
    const originY = (tt.originY ?? 'top') as string

    const baseX = Number(tt.scrollAreaLeft ?? left)
    const baseY = Number(tt.scrollAreaTop ?? top)

    let regionStart = baseX
    if (originX === 'center') {
      regionStart = baseX - areaWidth / 2
    } else if (originX === 'right') {
      regionStart = baseX - areaWidth
    }

    const textHeight = Number(tt.height ?? tt.fontSize ?? 20)
    let regionTop = baseY
    if (originY === 'center') {
      regionTop = baseY - textHeight / 2
    } else if (originY === 'bottom') {
      regionTop = baseY - textHeight
    }

    if (tt.clipPath) {
      tt.clipPath.set({
        left: regionStart,
        top: regionTop,
        width: configuredAreaWidth,
        height: textHeight,
        absolutePositioned: true,
      })
      if (typeof tt.clipPath.setCoords === 'function') {
        tt.clipPath.setCoords()
      }
    }

    const rect = tt.__scrollRegionRect
    if (rect) {
      rect.set({
        left: regionStart,
        top: regionTop,
        width: areaWidth,
        height: textHeight,
      })
      if (typeof rect.setCoords === 'function') {
        rect.setCoords()
      }
    }
  }

  if (!t.__scrollEventsBound) {
    t.on('selected', () => {
      pauseScrollableAnimation(t as FabricElement)
      ;(t as any).__scrollRegionVisible = true
      showScrollRegion(t as FabricElement)

      const baseX = Number((t as any).scrollAreaLeft ?? t.left ?? 0)
      const baseY = Number((t as any).scrollAreaTop ?? t.top ?? 0)
      const configuredAreaWidth = Number((t as any).scrollAreaWidth ?? canvas.getWidth() ?? 0)
      const areaWidth = Math.max(configuredAreaWidth, 0)
      const originX = ((t as any).originX ?? 'center') as string

      let regionStart = baseX
      if (originX === 'center') {
        regionStart = baseX - areaWidth / 2
      } else if (originX === 'right') {
        regionStart = baseX - areaWidth
      }
      const regionEnd = regionStart + areaWidth
      const width = Number((t as any).width ?? 0)

      const nextLeft = Math.min(
        Math.max(baseX, regionStart),
        Math.max(regionEnd - Math.min(width, areaWidth), regionStart),
      )
      ;(t as any).set('left', nextLeft)
      ;(t as any).set('top', baseY)
      ;(t as any).setCoords()

      syncScrollAreaAndClip(false)

      canvas.requestRenderAll()
    })
    t.on('deselected', () => {
      ;(t as any).__scrollRegionVisible = false
      hideScrollRegion(t as FabricElement)
      startScrollableAnimation(t as FabricElement)
    })

    t.on('moving', () => {
      pauseScrollableAnimation(t as FabricElement)
      syncScrollAreaAndClip(true)
      canvas.requestRenderAll()
    })

    t.on('modified', () => {
      syncScrollAreaAndClip(true)
      startScrollableAnimation(t as FabricElement)
    })

    t.__scrollEventsBound = true
  }

  const speed = 1
  if (t.__scrollInterval) {
    clearInterval(t.__scrollInterval)
  }

  const interval = window.setInterval(() => {
    if (!canvas || !t) return

    const width = Number(t.width ?? 0)
    const currentLeft = Number(t.left ?? 0)

    const baseX = t.scrollAreaLeft
    const configuredAreaWidth = Number(t.scrollAreaWidth ?? canvas.getWidth() ?? 0)
    const areaWidth = Math.max(configuredAreaWidth, 0)
    const originX = (t.originX ?? 'center') as string
    const originY = (t.originY ?? 'top') as string

    if (!t.clipPath) {
      let clipRegionStart = baseX
      if (originX === 'center') {
        clipRegionStart = baseX - configuredAreaWidth / 2
      } else if (originX === 'right') {
        clipRegionStart = baseX - configuredAreaWidth
      }

      const textHeight = Number(t.height ?? t.fontSize ?? 20)
      const baseY = typeof t.scrollAreaTop === 'number' ? t.scrollAreaTop : Number(t.top ?? 0)
      let clipTop = baseY
      if (originY === 'center') {
        clipTop = baseY - textHeight / 2
      } else if (originY === 'bottom') {
        clipTop = baseY - textHeight
      }

      const clipRect = new Rect({
        left: clipRegionStart,
        top: clipTop,
        width: configuredAreaWidth,
        height: textHeight,
        absolutePositioned: true,
      }) as any

      t.clipPath = clipRect
    } else {
      syncScrollAreaAndClip(false)
    }

    let regionStart = baseX
    if (originX === 'center') {
      regionStart = baseX - areaWidth / 2
    } else if (originX === 'right') {
      regionStart = baseX - areaWidth
    }
    const regionEnd = regionStart + areaWidth

    if (!t.__scrollInitDone) {
      t.set('left', regionEnd)
      t.setCoords()
      t.__scrollInitDone = true
    }

    let nextLeft = currentLeft - speed
    if (nextLeft + width < regionStart) {
      nextLeft = regionEnd
    }

    t.set('left', nextLeft)
    t.setCoords()

    canvas.requestRenderAll()
  }, 30)

  t.__scrollInterval = interval
}

import { FabricObject, FabricText, classRegistry, type Canvas } from 'fabric'
import { usePropertiesStore } from '@/stores/properties'
import type { PropertiesMap } from '@/types/properties'
import type { ComplicationElementConfig } from '@/types/elements/complication'
import { complicationPreview, resolveComplicationType } from './complication.catalog'
import { COMPLICATION_FIELDS, complicationIcon, complicationProgress, complicationTouchBounds, drawComplicationIcon, normalizeComplicationPresentation } from './complication.presentation'
import { applyCurrentElementPreviewFont } from '@/composables/useGarminSystemFont'
import { getSavedFontFamily, getSavedFontSize } from '@/utils/systemFontElement'

// Keep text as a real FabricText so custom BMFont / recipe previews keep working.
// The containing object owns the fixed slot and the independent interaction area.
export class ComplicationObject extends FabricObject {
  static type = 'WristoComplication'
  static customProperties = [
    ...COMPLICATION_FIELDS,
    'id',
    'eleType',
    'assetFontFamily',
    'fontFamily',
    'fontSize',
    'fillProperty',
    'layerName',
    'text',
    'visibility',
    'layoutVisibility',
    'displayStates'
  ]
  private label = new FabricText('', { originX: 'center', originY: 'center', objectCaching: false })
  private source = 18
  private ratio: number | null = null
  text = '';
  [key: string]: any

  constructor(options: any = {}) {
    super(options)
    this.refreshPreview(usePropertiesStore().allProperties)
  }

  refreshPreview(properties: PropertiesMap) {
    const config = this as unknown as ComplicationElementConfig
    const normalized = normalizeComplicationPresentation(config)
    this.set({ width: normalized.displayWidth, height: normalized.displayHeight })
    try {
      this.source = resolveComplicationType(config, properties)
      this.text = complicationPreview(config, properties)
      this.ratio = complicationProgress(config, this.source)
    } catch {
      this.text = '--'
      this.ratio = null
    }
    this.label.set({ text: this.text, fill: this.fill })
    this.label.canvas = this.canvas
    if (!['icon', 'shortcut'].includes(config.displayMode)) {
      applyCurrentElementPreviewFont(this.label, { fontFamily: getSavedFontFamily(this), fontSize: getSavedFontSize(this, 36), fill: this.fill }, this.text)
    }
    this.dirty = true
    this.setCoords()
  }

  _renderBackground(_ctx: CanvasRenderingContext2D) {
    /* Background is controlled by backgroundShape below. */
  }

  _render(ctx: CanvasRenderingContext2D) {
    const config = normalizeComplicationPresentation(this as unknown as ComplicationElementConfig)
    if (config.displayMode === 'shortcut') return
    const w = this.width,
      h = this.height
    const color = typeof this.fill === 'string' ? this.fill : '#ffffff'
    ctx.save()
    ctx.beginPath()
    ctx.rect(-w / 2, -h / 2, w, h)
    ctx.clip()
    ctx.fillStyle = config.backgroundColor
    if (config.backgroundShape === 'circle') {
      ctx.beginPath()
      ctx.arc(0, 0, Math.min(w, h) / 2, 0, Math.PI * 2)
      ctx.fill()
    } else if (config.backgroundShape === 'rounded') {
      ctx.beginPath()
      ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(w, h) * 0.2)
      ctx.fill()
    }
    if (config.displayMode === 'progress') {
      const thickness = Math.min(config.progressThickness, Math.min(w, h) / 2)
      const radius = Math.max(0, (Math.min(w, h) - thickness) / 2)
      ctx.lineWidth = thickness
      ctx.strokeStyle = config.progressTrackColor
      ctx.beginPath()
      ctx.arc(0, 0, radius, 0, Math.PI * 2)
      ctx.stroke()
      if (this.ratio !== null && this.ratio > 0) {
        ctx.strokeStyle = color
        ctx.beginPath()
        ctx.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + this.ratio * Math.PI * 2)
        ctx.stroke()
      }
    }
    const withIcon = config.displayMode === 'icon' || config.displayMode === 'iconValue'
    let textX = 0
    if (withIcon) {
      const total = config.displayMode === 'iconValue' ? config.iconSize + config.iconGap + this.label.width : config.iconSize
      drawComplicationIcon(ctx, complicationIcon(config, this.source), -total / 2, -config.iconSize / 2, config.iconSize, color)
      textX = (config.iconSize + config.iconGap) / 2
    }
    if (config.displayMode !== 'icon') {
      this.label.set({ left: textX, top: 0 })
      this.label.render(ctx)
    }
    ctx.restore()
  }
}

classRegistry.setClass(ComplicationObject)

const installed = new WeakSet<Canvas>()
export function installComplicationGuides(canvas: Canvas) {
  if (installed.has(canvas)) return
  installed.add(canvas)
  canvas.on('after:render', () => {
    // contextTop is editor-only: never baked into PNG exports or WRT previews.
    const ctx = canvas.contextTop
    const selected = new Set(canvas.getActiveObjects())
    for (const object of canvas.getObjects()) {
      const item = object as ComplicationObject
      if (item.eleType !== 'complication' || !item.visible || (item.displayMode !== 'shortcut' && !selected.has(item))) continue
      const bounds = complicationTouchBounds(item as unknown as ComplicationElementConfig)
      ctx.save()
      const retina = canvas.getRetinaScaling()
      ctx.setTransform(retina, 0, 0, retina, 0, 0)
      ctx.transform(...canvas.viewportTransform)
      ctx.transform(...item.calcTransformMatrix())
      ctx.strokeStyle = '#40c9ff'
      ctx.fillStyle = 'rgba(64,201,255,0.10)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      if (bounds.shape === 'circle') ctx.arc(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, bounds.width / 2, 0, Math.PI * 2)
      else ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height)
      ctx.fill()
      ctx.stroke()
      if (item.displayMode === 'shortcut') {
        ctx.setLineDash([])
        ctx.fillStyle = '#40c9ff'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Complication', 0, 4)
      }
      ctx.restore()
      canvas.contextTopDirty = true
    }
  })
}

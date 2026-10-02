import type { Canvas } from 'fabric'
import { interactionTouchBounds } from './elementInteraction'
const installed = new WeakSet<Canvas>()
export function installInteractionGuides(canvas: Canvas) {
  if (installed.has(canvas)) return
  installed.add(canvas)
  canvas.on('after:render', () => {
    const ctx = canvas.contextTop
    for (const element of canvas.getActiveObjects()) {
      if (!element.visible) continue
      const bounds = interactionTouchBounds(element)
      if (!bounds) continue
      ctx.save()
      const retina = canvas.getRetinaScaling()
      ctx.setTransform(retina, 0, 0, retina, 0, 0)
      ctx.transform(...canvas.viewportTransform)
      ctx.strokeStyle = '#40c9ff'; ctx.lineWidth = 1; ctx.setLineDash([4, 3])
      ctx.beginPath()
      if (bounds.shape === 'circle') ctx.arc(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2, bounds.width / 2, 0, Math.PI * 2)
      else ctx.rect(bounds.left, bounds.top, bounds.width, bounds.height)
      ctx.stroke(); ctx.restore()
      canvas.contextTopDirty = true
    }
  })
}
